import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import * as pdfjs from 'pdfjs-dist'
pdfjs.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.54/build/pdf.worker.mjs'
export const usePDFStore = defineStore('PDF', () => {
  const PDFFile = ref<File>()
  let PDFDocument: pdfjs.PDFDocumentProxy | undefined
  const currentPage = ref(1)
  const totalPages = ref(0)
  const scale = ref(1.5)
  const annotations = ref()
  const canvasRefs = new Map<number, HTMLCanvasElement>()
  const overlayCanvasRefs = new Map<number, HTMLCanvasElement>()
  // 新增：记录当前可见页
  const visiblePages = new Set<number>()
  // 只渲染可见页
  watch(scale, () => {
    visiblePages.forEach((pageNum) => {
      const canvas = canvasRefs.get(pageNum)
      if (canvas) renderPage(pageNum, canvas)
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
  }
  function setCanvasRef(e: unknown, pageNum: number) {
    if (e) canvasRefs.set(pageNum, e as HTMLCanvasElement)
    else canvasRefs.delete(pageNum)
  }
  function setOverlayCanvasRef(e: unknown, pageNum: number) {
    if (e) overlayCanvasRefs.set(pageNum, e as HTMLCanvasElement)
    else overlayCanvasRefs.delete(pageNum)
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
      const overlayCanvas = overlayCanvasRefs.get(pageNumber) as HTMLCanvasElement
      overlayCanvas.width = viewport.width
      overlayCanvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      const renderCtx = {
        canvasContext: ctx as CanvasRenderingContext2D,
        viewport,
        canvas,
      }
      await page.render(renderCtx).promise
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
  function handleMouseDown(e: MouseEvent, pageNum: number) {
    const canvas = canvasRefs.get(pageNum)
    if (canvas) {
    }
  }
  function handleMouseMove(e: MouseEvent, pageNum: number) {}
  function handleMouseUp(e: MouseEvent, pageNum: number) {}
  return {
    PDFFile,
    currentPage,
    totalPages,
    scale,
    annotations,
    canvasRefs,
    overlayCanvasRefs,
    PDFDocument,
    loadPDF,
    setCanvasRef,
    renderPage,
    renderAllPages,
    visiblePages,
    setPageVisible,
    setOverlayCanvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  }
})
