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

  // 导入标注数据
  const importAnnotations = (importData: any, clearExisting: boolean = false) => {
    try {
      // 验证导入数据格式
      if (!importData || typeof importData !== 'object') {
        throw new Error('导入数据格式无效')
      }

      // 清空现有数据（如果需要）
      if (clearExisting) {
        annotations.value = []
        annotationGroups.value = []
        selectedAnnotation.value = null
        selectedAnnotations.value.clear()
      }

      let importedCount = 0
      let importedGroupCount = 0

      // 处理题库格式的导入数据
      if (importData.questions && Array.isArray(importData.questions)) {
        importData.questions.forEach((question: any) => {
          // 创建组
          const groupId = question.id || `imported_group_${Date.now()}_${Math.random()}`
          const newGroup: AnnotationGroup = {
            id: groupId,
            name: question.groupName || `导入组_${importedGroupCount + 1}`,
            createdAt: new Date(),
            annotationIds: [],
            color: `hsl(${Math.random() * 360}, 70%, 80%)`,
          }

          // 处理各类型的标注
          const processAnnotationType = (items: any[], type: AnnotationType) => {
            if (!Array.isArray(items)) return

            items.forEach((item: any) => {
              if (!item.rectangle || !item.relativeRectangle) return

              const annotation: Annotation = {
                id: item.id || `imported_${Date.now()}_${Math.random()}`,
                pageNumber: item.pageNumber || 1,
                rectangle: item.rectangle,
                relativeRectangle: item.relativeRectangle,
                createdAt: new Date(item.createdAt || Date.now()),
                type,
                label: item.text || `${type} - 导入`,
                groupId: groupId,
              }

              annotations.value.push(annotation)
              newGroup.annotationIds.push(annotation.id)
              importedCount++

              // 处理关联的图片标注
              if (item.images && Array.isArray(item.images)) {
                item.images.forEach((imageData: any) => {
                  if (imageData.rectangle && imageData.relativeRectangle) {
                    const imageAnnotation: Annotation = {
                      id: imageData.id || `imported_img_${Date.now()}_${Math.random()}`,
                      pageNumber: imageData.pageNumber || item.pageNumber || 1,
                      rectangle: imageData.rectangle,
                      relativeRectangle: imageData.relativeRectangle,
                      createdAt: new Date(imageData.createdAt || Date.now()),
                      type: `${type}的图片` as AnnotationType,
                      label: imageData.text || `${type}的图片 - 导入`,
                      groupId: groupId,
                      parentId: annotation.id,
                    }

                    // 建立父子关系
                    if (!annotation.childIds) {
                      annotation.childIds = []
                    }
                    annotation.childIds.push(imageAnnotation.id)

                    annotations.value.push(imageAnnotation)
                    newGroup.annotationIds.push(imageAnnotation.id)
                    importedCount++
                  }
                })
              }
            })
          }

          // 处理各种类型的标注
          processAnnotationType(question.questions, '问题')
          processAnnotationType(question.options, '选项')
          processAnnotationType(question.answers, '答案')
          processAnnotationType(question.others, '其他')
          processAnnotationType(question.parses, '解析')

          // 只有当组中有标注时才添加组
          if (newGroup.annotationIds.length > 0) {
            annotationGroups.value.push(newGroup)
            importedGroupCount++
          }
        })
      }

      // 处理直接的标注数组格式
      else if (importData.annotations && Array.isArray(importData.annotations)) {
        importData.annotations.forEach((item: any) => {
          if (!item.rectangle || !item.relativeRectangle) return

          const annotation: Annotation = {
            id: item.id || `imported_${Date.now()}_${Math.random()}`,
            pageNumber: item.pageNumber || 1,
            rectangle: item.rectangle,
            relativeRectangle: item.relativeRectangle,
            createdAt: new Date(item.createdAt || Date.now()),
            type: item.type || '其他',
            label: item.label || item.text || '导入标注',
            groupId: item.groupId,
            parentId: item.parentId,
            childIds: item.childIds,
          }

          annotations.value.push(annotation)
          importedCount++
        })

        // 处理组信息
        if (importData.groups && Array.isArray(importData.groups)) {
          importData.groups.forEach((group: any) => {
            const newGroup: AnnotationGroup = {
              id: group.id || `imported_group_${Date.now()}_${Math.random()}`,
              name: group.name || `导入组_${importedGroupCount + 1}`,
              createdAt: new Date(group.createdAt || Date.now()),
              annotationIds: group.annotationIds || [],
              color: group.color || `hsl(${Math.random() * 360}, 70%, 80%)`,
            }
            annotationGroups.value.push(newGroup)
            importedGroupCount++
          })
        }
      }

      return {
        success: true,
        importedCount,
        importedGroupCount,
        message: `成功导入 ${importedCount} 个标注，${importedGroupCount} 个分组`,
      }
    } catch (error) {
      console.error('导入标注失败:', error)
      return {
        success: false,
        importedCount: 0,
        importedGroupCount: 0,
        message: error instanceof Error ? error.message : '导入失败',
      }
    }
  }

  // 验证导入数据格式
  const validateImportData = (data: any): { valid: boolean; message: string } => {
    if (!data || typeof data !== 'object') {
      return { valid: false, message: '数据格式无效' }
    }

    // 检查题库格式
    if (data.questions && Array.isArray(data.questions)) {
      for (const question of data.questions) {
        const types = ['questions', 'options', 'answers', 'others', 'parses']
        for (const type of types) {
          if (question[type] && Array.isArray(question[type])) {
            for (const item of question[type]) {
              if (!item.rectangle || !item.relativeRectangle) {
                return { valid: false, message: `${type} 中缺少必要的坐标信息` }
              }
            }
          }
        }
      }
      return { valid: true, message: '题库格式验证通过' }
    }

    // 检查直接标注格式
    if (data.annotations && Array.isArray(data.annotations)) {
      for (const annotation of data.annotations) {
        if (!annotation.rectangle || !annotation.relativeRectangle) {
          return { valid: false, message: '标注中缺少必要的坐标信息' }
        }
      }
      return { valid: true, message: '标注格式验证通过' }
    }

    return { valid: false, message: '未识别的数据格式' }
  }

  // 向现有分组添加标注
  const addToGroup = (groupId: string, annotationIds: string[]) => {
    const group = annotationGroups.value.find((g) => g.id === groupId)
    if (!group) return false

    annotationIds.forEach((annotationId) => {
      // 检查标注是否存在
      const annotation = annotations.value.find((a) => a.id === annotationId)
      if (!annotation) return

      // 如果标注已经在其他组中，先移除
      if (annotation.groupId && annotation.groupId !== groupId) {
        removeFromGroup(annotationId)
      }

      // 添加到新组
      if (!group.annotationIds.includes(annotationId)) {
        group.annotationIds.push(annotationId)
        annotation.groupId = groupId
      }
    })

    return true
  }

  // 获取可以添加到分组的标注（未分组的标注）
  const getAvailableAnnotationsForGroup = () => {
    return annotations.value.filter((annotation) => !annotation.groupId)
  }

  // API相关配置
  const API_BASE_URL = 'https://test.v1edu.com/js/a/interviewcompany/interviewCompanies'
  const API_KEY = 'tec-api-2025'

  // 获取URL参数
  const getUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const id = urlParams.get('company_id') || '1953384522108825600'
    const fileName = urlParams.get('company_name') || 'default'
    return { id, fileName }
  }

  // 从API导入数据
  const importFromAPI = async () => {
    try {
      const { id, fileName } = getUrlParams()
      const response = await fetch(
        `${API_BASE_URL}/tec-getQuestions?id=${id}&fileName=${encodeURIComponent(fileName)}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': API_KEY,
          },
        },
      )

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`)
      }

      const apiData = await response.json()

      // 转换API数据格式为内部格式
      const convertedData = convertAPIDataToInternal(apiData)

      // 导入转换后的数据
      const result = importAnnotations(convertedData, true)

      return {
        success: true,
        message: `成功从API导入数据: ${result.message}`,
        data: result,
      }
    } catch (error) {
      console.error('API导入失败:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'API导入失败',
        data: null,
      }
    }
  }

  // 导出数据到API
  const exportToAPI = async () => {
    try {
      const { id, fileName } = getUrlParams()

      // 转换内部数据格式为API格式
      const apiData = convertInternalDataToAPI()

      const response = await fetch(
        `${API_BASE_URL}/tec-updateQuestions?id=${encodeURIComponent(id)}&fileName=${encodeURIComponent(fileName + '.pdf')}`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        },
      )

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`)
      }

      const result = await response.json()

      return {
        success: true,
        message: result.message || '数据导出成功',
        data: result,
      }
    } catch (error) {
      console.error('API导出失败:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'API导出失败',
        data: null,
      }
    }
  }

  // 转换API数据为内部格式
  const convertAPIDataToInternal = (apiData: any) => {
    if (!Array.isArray(apiData)) {
      return { questions: [] }
    }

    const questions = apiData.map((item: any, index: number) => {
      const groupId = `api_group_${index}_${Date.now()}`

      return {
        id: groupId,
        groupName: `API导入题目_${index + 1}`,
        questions: [
          {
            id: `question_${groupId}`,
            text: item.question || '',
            pageNumber: 1,
            rectangle: { x: 50, y: 50 + index * 100, width: 400, height: 30 },
            relativeRectangle: { x: 0.1, y: 0.1 + index * 0.1, width: 0.8, height: 0.05 },
            createdAt: new Date(),
            type: '问题',
            images: [],
          },
        ],
        answers: [
          {
            id: `answer_${groupId}`,
            text: item.answer || '',
            pageNumber: 1,
            rectangle: { x: 50, y: 90 + index * 100, width: 400, height: 30 },
            relativeRectangle: { x: 0.1, y: 0.15 + index * 0.1, width: 0.8, height: 0.05 },
            createdAt: new Date(),
            type: '答案',
            images: [],
          },
        ],
        options: [],
        others: [],
        parses: [],
      }
    })

    return { questions }
  }

  // 转换内部数据为API格式（保持原有完整格式）
  const convertInternalDataToAPI = () => {
    // 获取未分组的标注
    const getUngroupedAnnotations = () => {
      const groupedIds = new Set<string>()

      // 收集所有已分组的标注ID
      annotationGroups.value.forEach((group) => {
        group.annotationIds.forEach((id) => {
          groupedIds.add(id)
          // 同时添加关联的子标注ID
          const childAnnotations = getChildAnnotations(id)
          childAnnotations.forEach((child) => groupedIds.add(child.id))
        })
      })

      // 返回未分组的标注
      return annotations.value.filter((annotation) => !groupedIds.has(annotation.id))
    }

    // 构建题库数据结构
    const questionBank = {
      title: `PDF标注题库_${new Date().toLocaleDateString()}`,
      totalQuestions: annotationGroups.value.length,
      totalAnnotations: annotations.value.length,
      questions: [] as any[],
    }

    // 构建新的导出结构
    const buildQuestionStructure = (groupAnnotations: Annotation[]) => {
      const processedIds = new Set<string>()

      // 按类型分组标注，每个文本标注单独处理其关联的图片
      const annotationsByType = {
        questions: [] as { text: Annotation; images: Annotation[] }[],
        options: [] as { text: Annotation; images: Annotation[] }[],
        answers: [] as { text: Annotation; images: Annotation[] }[],
        others: [] as { text: Annotation; images: Annotation[] }[],
        parses: [] as { text: Annotation; images: Annotation[] }[],
      }

      // 分类所有标注
      groupAnnotations.forEach((annotation: Annotation) => {
        if (processedIds.has(annotation.id)) return

        const baseType = annotation.type.replace('的图片', '')
        const isImage = annotation.type.includes('图片')

        // 跳过图片标注，它们会通过关联关系被处理
        if (isImage) {
          processedIds.add(annotation.id)
          return
        }

        // 获取该文本标注关联的所有图片
        const childImages = getChildAnnotations(annotation.id)

        const annotationData = {
          text: annotation,
          images: childImages,
        }

        switch (baseType) {
          case '问题':
            annotationsByType.questions.push(annotationData)
            break
          case '选项':
            annotationsByType.options.push(annotationData)
            break
          case '答案':
            annotationsByType.answers.push(annotationData)
            break
          case '其他':
            annotationsByType.others.push(annotationData)
            break
          case '解析':
            annotationsByType.parses.push(annotationData)
            break
        }

        processedIds.add(annotation.id)
        // 标记关联的图片为已处理
        childImages.forEach((child: Annotation) => processedIds.add(child.id))
      })

      // 构建每个类型的结构
      const buildTypeStructure = (typeData: { text: Annotation; images: Annotation[] }[]) => {
        return typeData.map((item: { text: Annotation; images: Annotation[] }) => ({
          id: item.text.id,
          text: item.text.label,
          pageNumber: item.text.pageNumber,
          rectangle: item.text.rectangle,
          relativeRectangle: item.text.relativeRectangle,
          createdAt: item.text.createdAt,
          type: item.text.type,
          images: item.images.map((img: Annotation) => ({
            id: img.id,
            text: img.label,
            pageNumber: img.pageNumber,
            rectangle: img.rectangle,
            relativeRectangle: img.relativeRectangle,
            createdAt: img.createdAt,
            type: img.type,
          })),
        }))
      }

      return {
        questions: buildTypeStructure(annotationsByType.questions),
        options: buildTypeStructure(annotationsByType.options),
        answers: buildTypeStructure(annotationsByType.answers),
        others: buildTypeStructure(annotationsByType.others),
        parses: buildTypeStructure(annotationsByType.parses),
      }
    }

    // 处理现有分组的标注
    annotationGroups.value.forEach((group) => {
      const groupAnnotations = group.annotationIds
        .map((id) => annotations.value.find((a) => a.id === id))
        .filter(Boolean) as Annotation[]

      if (groupAnnotations.length === 0) return

      const questionStructure = buildQuestionStructure(groupAnnotations)

      const question = {
        id: group.id,
        groupName: group.name,
        ...questionStructure,
      }

      questionBank.questions.push(question)
    })

    // 如果有未分组的标注，按页面和类型自动创建组
    const ungroupedAnnotations = getUngroupedAnnotations()
    if (ungroupedAnnotations.length > 0) {
      const annotationsByPage = new Map<number, Annotation[]>()
      ungroupedAnnotations.forEach((annotation: Annotation) => {
        if (!annotationsByPage.has(annotation.pageNumber)) {
          annotationsByPage.set(annotation.pageNumber, [])
        }
        annotationsByPage.get(annotation.pageNumber)!.push(annotation)
      })

      annotationsByPage.forEach((pageAnnotations, pageNum) => {
        // 按类型分组同一页面的标注
        const typeGroups = new Map<string, Annotation[]>()
        const processedIds = new Set<string>()

        pageAnnotations.forEach((annotation: Annotation) => {
          if (processedIds.has(annotation.id)) return

          const baseType = annotation.type.replace('的图片', '')
          const isImage = annotation.type.includes('图片')

          // 跳过图片标注，它们会通过关联关系被处理
          if (isImage) {
            processedIds.add(annotation.id)
            return
          }

          if (!typeGroups.has(baseType)) {
            typeGroups.set(baseType, [])
          }

          typeGroups.get(baseType)!.push(annotation)
          processedIds.add(annotation.id)

          // 添加关联的子标注
          const childAnnotations = getChildAnnotations(annotation.id)
          childAnnotations.forEach((child: Annotation) => {
            typeGroups.get(baseType)!.push(child)
            processedIds.add(child.id)
          })
        })

        // 为每个类型组创建题目
        typeGroups.forEach((annotations: Annotation[], baseType: string) => {
          if (annotations.length > 0) {
            const questionStructure = buildQuestionStructure(annotations)
            const randomNum = Math.floor(Math.random() * 1000) + 1

            const question = {
              id: `auto_group_${pageNum}_${baseType}_${randomNum}`,
              groupName: `第${pageNum}页_${baseType}_${randomNum}`,
              ...questionStructure,
            }

            questionBank.questions.push(question)
            questionBank.totalQuestions++
          }
        })
      })
    }

    return questionBank
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
    importAnnotations,
    validateImportData,
    addToGroup,
    getAvailableAnnotationsForGroup,
    importFromAPI,
    exportToAPI,
    convertAPIDataToInternal,
    convertInternalDataToAPI,
  }
})
