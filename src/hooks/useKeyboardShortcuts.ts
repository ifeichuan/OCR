import { onMounted, onUnmounted } from 'vue'
import { usePDFStore } from '@/stores/PDFStore'

export function useKeyboardShortcuts() {
  const pdfStore = usePDFStore()

  const handleKeyDown = (event: KeyboardEvent) => {
    // 防止在输入框中触发快捷键
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        pdfStore.currentPage = Math.max(1, pdfStore.currentPage - 1)
        break

      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        pdfStore.currentPage = Math.min(pdfStore.totalPages, pdfStore.currentPage + 1)
        break

      case '+':
      case '=':
        event.preventDefault()
        pdfStore.scale = Math.min(5, pdfStore.scale + 0.2)
        break

      case '-':
        event.preventDefault()
        pdfStore.scale = Math.max(0.2, pdfStore.scale - 0.2)
        break

      case '0':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          pdfStore.scale = 1
        }
        break
      // 下面的注释部分可根据你的注释功能实现补充
      // case 'Escape':
      //   event.preventDefault()
      //   pdfStore.selectAnnotation(null)
      //   break
      // case 'Delete':
      // case 'Backspace':
      //   if (pdfStore.selectedAnnotation) {
      //     event.preventDefault()
      //     pdfStore.removeAnnotation(pdfStore.selectedAnnotation)
      //   }
      //   break
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })
}
