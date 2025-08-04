<template>
  <div class="flex gap-3 h-screen">
    <div class="bg-amber-200 flex gap-3 flex-col p-3 w-1/8 shrink-0">
      <ElButton @click="selectFile">上传文件</ElButton>
      <ElInputNumber v-model="PDFStore.scale" :step="0.1" :max="2.8" :min="0.5"></ElInputNumber>
    </div>
    <div class="flex flex-col gap-2 w-7/8 overflow-y-auto">
      <div
        v-for="pageNum in PDFStore.totalPages"
        :key="pageNum"
        class="border rounded-2xl p-1 relative m-auto"
      >
        <canvas :ref="(el) => PDFStore.setCanvasRef(el, pageNum)" :data-page="pageNum"></canvas>
        <canvas
          :ref="(el) => PDFStore.setOverlayCanvasRef(el, pageNum)"
          :data-page="pageNum"
          class="absolute left-0 top-0 pointer-events-auto"
          style="z-index: 10"
          @mousedown="(e) => PDFStore.handleMouseDown(e, pageNum)"
          @mousemove="(e) => PDFStore.handleMouseMove(e, pageNum)"
          @mouseup="(e) => PDFStore.handleMouseUp(e, pageNum)"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { PDFStore } from '@/main'
import { ElButton, ElInputNumber, ElMessage } from 'element-plus'
useKeyboardShortcuts()
const selectFile = async () => {
  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.setAttribute('accept', '.pdf')
  input.click()
  input.onchange = async (e) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) {
      ElMessage.error('没有选中文件!')
      return
    }
    console.log(file)
    PDFStore.PDFFile = file
    await PDFStore.loadPDF()
    // PDFStore.renderAllPages()
    const observer = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          const page = Number((entry.target as HTMLCanvasElement).dataset.page)
          PDFStore.setPageVisible(page, entry.isIntersecting)
          if (entry.isIntersecting) {
            console.log(page, entry)

            await PDFStore.renderPage(page, entry.target as HTMLCanvasElement)
          }
        }
      },
      { threshold: 0.1 },
    )
    PDFStore.canvasRefs.forEach((canvasRef) => {
      observer.observe(canvasRef)
    })
  }
}
</script>

<style scoped></style>
