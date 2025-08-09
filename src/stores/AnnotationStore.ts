import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePDFStore } from './PDFStore'

// 类型定义
export interface Point {
  x: number
  y: number
}

export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

export interface RelativeRectangle {
  x: number
  y: number
  width: number
  height: number
}

export type AnnotationType =
  | '问题'
  | '问题的图片'
  | '选项'
  | '选项的图片'
  | '答案'
  | '答案的图片'
  | '其他'
  | '其他的图片'
  | '解析'
  | '解析的图片'

export interface Annotation {
  id: string
  pageNumber: number
  rectangle: Rectangle
  relativeRectangle: RelativeRectangle
  createdAt: Date
  thumbnail?: string
  type: AnnotationType
  label: string
  groupId?: string
  parentId?: string // 父标注ID（用于图片关联到文本）
  childIds?: string[] // 子标注ID数组（用于文本关联到图片）
}

export interface AnnotationGroup {
  id: string
  name: string
  createdAt: Date
  annotationIds: string[]
  color?: string
}

export const useAnnotationStore = defineStore('annotation', () => {
  const PDFStore = usePDFStore()

  const annotations = ref<Annotation[]>([])
  const selectedAnnotation = ref<string | null>(null)
  const selectedAnnotations = ref<Set<string>>(new Set())
  const annotationGroups = ref<AnnotationGroup[]>([])
  const isGroupMode = ref(false)

  // 标注管理函数
  const addAnnotation = (annotation: Annotation) => {
    annotations.value.push(annotation)
  }

  const selectAnnotation = (id: string | null) => {
    selectedAnnotation.value = id
  }

  // 编组相关方法
  const toggleAnnotationSelection = (annotationId: string) => {
    if (selectedAnnotations.value.has(annotationId)) {
      selectedAnnotations.value.delete(annotationId)
    } else {
      selectedAnnotations.value.add(annotationId)
    }
  }

  const clearAnnotationSelection = () => {
    selectedAnnotations.value.clear()
  }

  const createGroup = (groupName: string) => {
    if (selectedAnnotations.value.size === 0) return null

    const groupId = Date.now().toString()
    const newGroup: AnnotationGroup = {
      id: groupId,
      name: groupName,
      createdAt: new Date(),
      annotationIds: Array.from(selectedAnnotations.value),
      color: `hsl(${Math.random() * 360}, 70%, 80%)`,
    }

    // 更新标注的groupId
    annotations.value.forEach((annotation) => {
      if (selectedAnnotations.value.has(annotation.id)) {
        annotation.groupId = groupId
      }
    })

    annotationGroups.value.push(newGroup)
    clearAnnotationSelection()
    return newGroup
  }

  const removeFromGroup = (annotationId: string) => {
    const annotation = annotations.value.find((a) => a.id === annotationId)
    if (!annotation?.groupId) return

    const group = annotationGroups.value.find((g) => g.id === annotation.groupId)
    if (group) {
      group.annotationIds = group.annotationIds.filter((id) => id !== annotationId)
      if (group.annotationIds.length === 0) {
        annotationGroups.value = annotationGroups.value.filter((g) => g.id !== group.id)
      }
    }
    annotation.groupId = undefined
  }

  const deleteGroup = (groupId: string) => {
    // 移除标注的groupId
    annotations.value.forEach((annotation) => {
      if (annotation.groupId === groupId) {
        annotation.groupId = undefined
      }
    })
    // 删除组
    annotationGroups.value = annotationGroups.value.filter((g) => g.id !== groupId)
  }

  const getGroupedAnnotations = () => {
    const grouped: { [key: string]: Annotation[] } = {}
    const ungrouped: Annotation[] = []

    annotations.value.forEach((annotation) => {
      if (annotation.groupId) {
        if (!grouped[annotation.groupId]) {
          grouped[annotation.groupId] = []
        }
        grouped[annotation.groupId].push(annotation)
      } else {
        ungrouped.push(annotation)
      }
    })

    return { grouped, ungrouped }
  }

  // 手动关联标注（建立父子关系）
  const linkAnnotations = (parentId: string, childId: string) => {
    const parentAnnotation = annotations.value.find((a) => a.id === parentId)
    const childAnnotation = annotations.value.find((a) => a.id === childId)

    if (!parentAnnotation || !childAnnotation) return false

    // 检查类型是否匹配（例如：问题 -> 问题的图片）
    const baseType = parentAnnotation.type
    const expectedChildType = `${baseType}的图片`

    if (childAnnotation.type !== expectedChildType) {
      return false // 类型不匹配
    }

    // 建立关联关系
    if (!parentAnnotation.childIds) {
      parentAnnotation.childIds = []
    }

    if (!parentAnnotation.childIds.includes(childId)) {
      parentAnnotation.childIds.push(childId)
    }

    childAnnotation.parentId = parentId

    return true
  }

  // 取消标注关联
  const unlinkAnnotations = (parentId: string, childId: string) => {
    const parentAnnotation = annotations.value.find((a) => a.id === parentId)
    const childAnnotation = annotations.value.find((a) => a.id === childId)

    if (!parentAnnotation || !childAnnotation) return false

    // 移除关联关系
    if (parentAnnotation.childIds) {
      parentAnnotation.childIds = parentAnnotation.childIds.filter((id) => id !== childId)
      if (parentAnnotation.childIds.length === 0) {
        delete parentAnnotation.childIds
      }
    }

    delete childAnnotation.parentId

    return true
  }

  // 获取标注的子标注
  const getChildAnnotations = (parentId: string): Annotation[] => {
    const parentAnnotation = annotations.value.find((a) => a.id === parentId)
    if (!parentAnnotation?.childIds) return []

    return parentAnnotation.childIds
      .map((id) => annotations.value.find((a) => a.id === id))
      .filter(Boolean) as Annotation[]
  }

  // 获取可以关联的标注（跨页面且类型匹配）
  const getAvailableChildAnnotations = (parentId: string): Annotation[] => {
    const parentAnnotation = annotations.value.find((a) => a.id === parentId)
    if (!parentAnnotation) return []

    const baseType = parentAnnotation.type
    const expectedChildType = `${baseType}的图片`

    return annotations.value.filter(
      (annotation) =>
        annotation.id !== parentId && annotation.type === expectedChildType && !annotation.parentId, // 未被其他标注关联
    )
  }

  // 生成缩略图
  const generateThumbnail = (canvas: HTMLCanvasElement, rect: Rectangle): string => {
    const thumbnailCanvas = document.createElement('canvas')
    const thumbnailCtx = thumbnailCanvas.getContext('2d')
    if (!thumbnailCtx) return ''

    thumbnailCanvas.width = rect.width
    thumbnailCanvas.height = rect.height

    thumbnailCtx.drawImage(
      canvas,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      rect.width,
      rect.height,
    )

    return thumbnailCanvas.toDataURL()
  }

  return {
    annotations,
    selectedAnnotation,
    selectedAnnotations,
    annotationGroups,
    isGroupMode,
    addAnnotation,
    selectAnnotation,
    toggleAnnotationSelection,
    clearAnnotationSelection,
    createGroup,
    removeFromGroup,
    deleteGroup,
    getGroupedAnnotations,
    linkAnnotations,
    unlinkAnnotations,
    getChildAnnotations,
    getAvailableChildAnnotations,
    generateThumbnail,
  }
})
