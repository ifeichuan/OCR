import { defineStore } from 'pinia'
import { ref, watch, nextTick } from 'vue'
import * as pdfjs from 'pdfjs-dist'
pdfjs.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.54/build/pdf.worker.mjs'

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

export type AnnotationType = '题目' | '选项' | '答案' | '图片' | '自定义'

export interface Annotation {
  id: string
  pageNumber: number
  rectangle: Rectangle
  relativeRectangle: RelativeRectangle
  createdAt: Date
  thumbnail?: string
  type: AnnotationType
  label: string
}

export interface PageInfo {
  pageNumber: number
  rendered: boolean
  viewport?: pdfjs.PageViewport
  offsetY: number
}

export interface CanvasState {
  isDrawing: boolean
  startPoint: Point | null
  currentRect: Rectangle | null
}

export interface PendingAnnotation {
  rect: Rectangle
  pageInfo: PageInfo
}

export const usePDFStore = defineStore('PDF', () => {
  const PDFFile = ref<File>()
  let PDFDocument: pdfjs.PDFDocumentProxy | undefined
  const currentPage = ref(1)
  const totalPages = ref(0)
  const scale = ref(1.5)
  const annotations = ref<Annotation[]>([])
  const selectedAnnotation = ref<string | null>(null)
  const canvasRefs = new Map<number, HTMLCanvasElement>()
  const overlayCanvasRefs = new Map<number, HTMLCanvasElement>()
  // 新增：记录当前可见页
  const visiblePages = new Set<number>()

  // 页面信息
  const allPageInfos = ref<PageInfo[]>([])

  // Canvas状态
  const canvasState = ref<CanvasState>({
    isDrawing: false,
    startPoint: null,
    currentRect: null,
  })

  // 等待确认的标注
  const pendingAnnotation = ref<PendingAnnotation | null>(null)

  // 工具栏状态
  const showToolbar = ref(false)
  const toolbarPosition = ref({ x: 0, y: 0 })

  // 容器引用和滚动状态
  const containerRef = ref<HTMLElement | null>(null)
  const scrollTop = ref(0)

  // 页面Canvas映射
  const pageCanvases = ref(new Map<number, HTMLCanvasElement>())
  const annotationCanvases = ref(new Map<number, HTMLCanvasElement>())

  // 只渲染可见页
  watch(scale, () => {
    visiblePages.forEach((pageNum) => {
      const canvas = canvasRefs.get(pageNum)
      if (canvas) {
        renderPage(pageNum, canvas).then(() => {
          // 页面渲染完成后重新绘制标注
          drawPageAnnotations(pageNum)
        })
      }
    })
  })

  async function loadPDF() {
    if (!PDFFile.value) return
    const arrayBuffer = await PDFFile.value.arrayBuffer()
    await pdfjs.getDocument({ data: arrayBuffer }).promise.then((doc) => {
      console.log('PDF Loaded')
      PDFDocument = doc
    })
    totalPages.value = PDFDocument?.numPages || 0

    // 初始化页面信息
    allPageInfos.value = Array.from({ length: totalPages.value }, (_, i) => ({
      pageNumber: i + 1,
      rendered: false,
      offsetY: 0,
    }))
  }

  function setCanvasRef(e: unknown, pageNum: number) {
    if (e) {
      canvasRefs.set(pageNum, e as HTMLCanvasElement)
      pageCanvases.value.set(pageNum, e as HTMLCanvasElement)
    } else {
      canvasRefs.delete(pageNum)
      pageCanvases.value.delete(pageNum)
    }
  }

  function setOverlayCanvasRef(e: unknown, pageNum: number) {
    if (e) {
      overlayCanvasRefs.set(pageNum, e as HTMLCanvasElement)
      annotationCanvases.value.set(pageNum, e as HTMLCanvasElement)
    } else {
      overlayCanvasRefs.delete(pageNum)
      annotationCanvases.value.delete(pageNum)
    }
  }

  // 新增：设置页面是否可见
  function setPageVisible(pageNum: number, visible: boolean) {
    if (visible) visiblePages.add(pageNum)
    else visiblePages.delete(pageNum)
  }

  async function renderPage(pageNumber: number, canvas: HTMLCanvasElement) {
    if (!PDFDocument) return
    try {
      const page = await PDFDocument.getPage(pageNumber)
      const viewport = page.getViewport({ scale: scale.value })
      canvas.width = viewport.width
      canvas.height = viewport.height

      // 更新页面信息中的viewport
      const pageInfo = allPageInfos.value.find((p) => p.pageNumber === pageNumber)
      if (pageInfo) {
        pageInfo.viewport = viewport
      }

      const overlayCanvas = overlayCanvasRefs.get(pageNumber) as HTMLCanvasElement
      if (overlayCanvas) {
        overlayCanvas.width = viewport.width
        overlayCanvas.height = viewport.height
      }

      const ctx = canvas.getContext('2d')
      const renderCtx = {
        canvasContext: ctx as CanvasRenderingContext2D,
        viewport,
        canvas,
      }
      await page.render(renderCtx).promise

      // 标记页面已渲染
      if (pageInfo) {
        pageInfo.rendered = true
      }

      return {
        canvas,
        viewport,
        page,
      }
    } catch (err) {
      console.error(err)
    }
  }

  function renderAllPages() {
    console.log('renderAllPages')
    for (let i = 1; i <= totalPages.value; i++) {
      renderPage(i, canvasRefs.get(i) as HTMLCanvasElement)
    }
  }

  // 坐标转换函数
  const canvasToRelative = (rect: Rectangle, pageNumber: number): RelativeRectangle => {
    const pageInfo = allPageInfos.value.find((p) => p.pageNumber === pageNumber)
    if (!pageInfo?.viewport) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }

    return {
      x: rect.x / pageInfo.viewport.width,
      y: rect.y / pageInfo.viewport.height,
      width: rect.width / pageInfo.viewport.width,
      height: rect.height / pageInfo.viewport.height,
    }
  }

  const relativeToCanvas = (relRect: RelativeRectangle, pageNumber: number): Rectangle => {
    const pageInfo = allPageInfos.value.find((p) => p.pageNumber === pageNumber)
    if (!pageInfo?.viewport) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }

    return {
      x: relRect.x * pageInfo.viewport.width,
      y: relRect.y * pageInfo.viewport.height,
      width: relRect.width * pageInfo.viewport.width,
      height: relRect.height * pageInfo.viewport.height,
    }
  }

  // 绘制矩形
  const drawRectangle = (
    ctx: CanvasRenderingContext2D,
    rect: Rectangle,
    isSelected: boolean = false,
    isDrawing: boolean = false,
    annotationType?: AnnotationType,
  ) => {
    ctx.save()

    if (isDrawing) {
      ctx.strokeStyle = '#1976d2'
      ctx.fillStyle = 'rgba(25, 118, 210, 0.1)'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
    } else if (isSelected) {
      ctx.strokeStyle = '#f44336'
      ctx.fillStyle = 'rgba(244, 67, 54, 0.1)'
      ctx.lineWidth = 2
      ctx.setLineDash([])
    } else {
      switch (annotationType) {
        case '题目':
          ctx.strokeStyle = '#1976d2'
          ctx.fillStyle = 'rgba(25, 118, 210, 0.1)'
          break
        case '选项':
          ctx.strokeStyle = '#7b1fa2'
          ctx.fillStyle = 'rgba(123, 31, 162, 0.1)'
          break
        case '答案':
          ctx.strokeStyle = '#388e3c'
          ctx.fillStyle = 'rgba(56, 142, 60, 0.1)'
          break
        default:
          ctx.strokeStyle = '#4caf50'
          ctx.fillStyle = 'rgba(76, 175, 80, 0.1)'
      }
      ctx.lineWidth = 2
      ctx.setLineDash([])
    }

    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    ctx.restore()
  }

  // 绘制页面标注
  const drawPageAnnotations = (pageNumber: number) => {
    const canvas = annotationCanvases.value.get(pageNumber)
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制该页面的已保存标注 - 使用相对坐标确保缩放时正确显示
    const pageAnnotations = annotations.value.filter((a) => a.pageNumber === pageNumber)
    pageAnnotations.forEach((annotation) => {
      const canvasRect = relativeToCanvas(annotation.relativeRectangle, pageNumber)
      drawRectangle(
        ctx,
        canvasRect,
        annotation.id === selectedAnnotation.value,
        false,
        annotation.type,
      )
    })

    // 绘制当前正在绘制的矩形（拖动时）
    if (
      canvasState.value.currentRect &&
      canvasState.value.isDrawing &&
      pendingAnnotation.value?.pageInfo.pageNumber === pageNumber
    ) {
      drawRectangle(ctx, canvasState.value.currentRect, false, true)
    }

    // 绘制等待确认的矩形（松开鼠标后，工具栏显示时）
    if (
      pendingAnnotation.value &&
      pendingAnnotation.value.pageInfo.pageNumber === pageNumber &&
      !canvasState.value.isDrawing
    ) {
      drawRectangle(ctx, pendingAnnotation.value.rect, false, true)
    }
  }

  // 获取鼠标在Canvas上的坐标
  const getCanvasPoint = (event: MouseEvent, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  // 标注管理函数
  const addAnnotation = (annotation: Annotation) => {
    annotations.value.push(annotation)
  }

  const selectAnnotation = (id: string | null) => {
    selectedAnnotation.value = id
  }

  function handleMouseDown(e: MouseEvent, pageNum: number) {
    console.log('🖱️ VirtualPDF 鼠标按下事件触发!', {
      pageNumber: pageNum,
      target: e.target,
    })

    if (e.button !== 0) {
      console.log('❌ 不是左键，忽略')
      return
    }

    const canvas = annotationCanvases.value.get(pageNum)
    if (!canvas) {
      console.log('❌ 找不到标注Canvas:', pageNum)
      return
    }

    const pageInfo = allPageInfos.value.find((p) => p.pageNumber === pageNum)
    if (!pageInfo) {
      console.log('❌ 找不到页面信息:', pageNum)
      return
    }

    const point = getCanvasPoint(e, canvas)
    console.log('✅ 获取到坐标:', point)

    // 检查是否点击了现有标注
    const pageAnnotations = annotations.value.filter((a) => a.pageNumber === pageNum)
    const clickedAnnotation = pageAnnotations.find((annotation) => {
      const canvasRect = annotation.relativeRectangle
        ? relativeToCanvas(annotation.relativeRectangle, pageNum)
        : annotation.rectangle
      return (
        point.x >= canvasRect.x &&
        point.x <= canvasRect.x + canvasRect.width &&
        point.y >= canvasRect.y &&
        point.y <= canvasRect.y + canvasRect.height
      )
    })

    if (clickedAnnotation) {
      console.log('✅ 点击了现有标注:', clickedAnnotation.id)
      selectAnnotation(clickedAnnotation.id)
      drawPageAnnotations(pageNum)
      return
    }

    // 取消选中
    selectAnnotation(null)

    // 开始绘制新标注
    canvasState.value.isDrawing = true
    canvasState.value.startPoint = point
    canvasState.value.currentRect = {
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    }

    // 记录当前绘制的页面
    pendingAnnotation.value = { rect: canvasState.value.currentRect, pageInfo }

    console.log('✅ 开始绘制新标注，起始点:', point)
    drawPageAnnotations(pageNum)
  }

  function handleMouseMove(e: MouseEvent, pageNum: number) {
    console.log('🖱️ VirtualPDF 鼠标移动事件触发!', {
      isDrawing: canvasState.value.isDrawing,
      pageNumber: pageNum,
    })

    if (!canvasState.value.isDrawing || !canvasState.value.startPoint) {
      console.log('❌ 不在绘制状态或没有起始点')
      return
    }

    const canvas = annotationCanvases.value.get(pageNum)
    if (!canvas) {
      console.log('❌ 找不到标注Canvas:', pageNum)
      return
    }

    const currentPoint = getCanvasPoint(e, canvas)
    const startPoint = canvasState.value.startPoint

    canvasState.value.currentRect = {
      x: Math.min(startPoint.x, currentPoint.x),
      y: Math.min(startPoint.y, currentPoint.y),
      width: Math.abs(currentPoint.x - startPoint.x),
      height: Math.abs(currentPoint.y - startPoint.y),
    }

    // 更新pendingAnnotation中的矩形
    if (pendingAnnotation.value) {
      pendingAnnotation.value.rect = canvasState.value.currentRect
    }

    console.log('✅ 更新矩形:', canvasState.value.currentRect)
    drawPageAnnotations(pageNum)
  }

  function handleMouseUp(e: MouseEvent, pageNum: number) {
    console.log('🖱️ VirtualPDF 鼠标松开事件触发!', {
      isDrawing: canvasState.value.isDrawing,
      currentRect: canvasState.value.currentRect,
    })

    if (!canvasState.value.isDrawing || !canvasState.value.currentRect) {
      console.log('❌ 不在绘制状态或没有当前矩形')
      return
    }

    const rect = canvasState.value.currentRect
    const pageInfo = allPageInfos.value.find((p) => p.pageNumber === pageNum)
    if (!pageInfo) {
      console.log('❌ 找不到页面信息:', pageNum)
      return
    }

    console.log('✅ 完成绘制，矩形尺寸:', rect)

    if (rect.width > 10 && rect.height > 10) {
      // 保持pendingAnnotation，这样矩形会继续显示
      if (!pendingAnnotation.value) {
        pendingAnnotation.value = { rect, pageInfo }
      } else {
        pendingAnnotation.value.rect = rect
      }

      // 计算工具栏位置
      const canvas = annotationCanvases.value.get(pageNum)
      if (canvas) {
        const canvasRect = canvas.getBoundingClientRect()
        const scaleX = canvasRect.width / canvas.width
        const scaleY = canvasRect.height / canvas.height

        toolbarPosition.value = {
          x: canvasRect.left + (rect.x + rect.width / 2) * scaleX,
          y: canvasRect.top + rect.y * scaleY,
        }
      }

      showToolbar.value = true
      console.log('✅ 显示工具栏，等待用户选择标注类型')
    } else {
      console.log('❌ 矩形太小，取消绘制')
      // 如果矩形太小，清理状态
      pendingAnnotation.value = null
    }

    // 重置绘制状态，但保持pendingAnnotation以显示矩形
    canvasState.value.isDrawing = false
    canvasState.value.startPoint = null
    canvasState.value.currentRect = null

    // 重新绘制，这时会显示pendingAnnotation中的矩形
    drawPageAnnotations(pageNum)
  }

  const handleMouseLeave = (event: MouseEvent, pageNum: number) => {
    handleMouseUp(event, pageNum)
  }

  // 处理标注类型选择
  const handleTypeSelected = (type: AnnotationType) => {
    if (!pendingAnnotation.value) return

    const { rect, pageInfo } = pendingAnnotation.value
    const relativeRect = canvasToRelative(rect, pageInfo.pageNumber)

    // 生成缩略图（这里需要根据实际的exportService实现）
    const canvas = pageCanvases.value.get(pageInfo.pageNumber)
    const thumbnail = canvas ? generateThumbnail(canvas, rect) : undefined

    const annotation: Annotation = {
      id: Date.now().toString(),
      pageNumber: pageInfo.pageNumber,
      rectangle: rect,
      relativeRectangle: relativeRect,
      createdAt: new Date(),
      thumbnail,
      type,
      label: `${type} - ${new Date().toLocaleTimeString()}`,
    }

    addAnnotation(annotation)

    // 隐藏工具栏并清理状态
    showToolbar.value = false
    pendingAnnotation.value = null

    drawPageAnnotations(pageInfo.pageNumber)
  }

  // 简单的缩略图生成函数
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
    PDFFile,
    currentPage,
    totalPages,
    scale,
    annotations,
    selectedAnnotation,
    canvasRefs,
    overlayCanvasRefs,
    PDFDocument,
    allPageInfos,
    canvasState,
    pendingAnnotation,
    showToolbar,
    toolbarPosition,
    containerRef,
    scrollTop,
    pageCanvases,
    annotationCanvases,
    visiblePages,
    loadPDF,
    setCanvasRef,
    renderPage,
    renderAllPages,
    setPageVisible,
    setOverlayCanvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTypeSelected,
    addAnnotation,
    selectAnnotation,
    drawPageAnnotations,
    canvasToRelative,
    relativeToCanvas,
    getCanvasPoint,
    drawRectangle,
    generateThumbnail,
  }
})
