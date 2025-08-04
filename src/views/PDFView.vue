<template>
  <div class="flex gap-3 h-screen relative">
    <!-- 左侧面板 -->
    <div class="bg-amber-200 flex gap-3 flex-col p-3 w-80 shrink-0 overflow-y-auto">
      <ElButton @click="selectFile">上传文件</ElButton>
      <ElInputNumber v-model="PDFStore.scale" :step="0.1" :max="2.8" :min="0.5"></ElInputNumber>

      <!-- 标注缩略图列表 -->
      <div v-if="PDFStore.annotations.length > 0" class="mt-4">
        <h3 class="text-sm font-bold mb-2">标注列表</h3>
        <div class="space-y-2">
          <div
            v-for="annotation in PDFStore.annotations"
            :key="annotation.id"
            class="border rounded p-2 cursor-pointer hover:bg-yellow-100"
            :class="{ 'bg-yellow-300': annotation.id === PDFStore.selectedAnnotation }"
            @click="selectAnnotation(annotation)"
          >
            <div class="text-xs text-gray-600 mb-1">
              第{{ annotation.pageNumber }}页 - {{ annotation.type }}
            </div>
            <div v-if="annotation.thumbnail" class="mb-1">
              <img :src="annotation.thumbnail" class="max-w-full h-16 object-contain border" />
            </div>
            <div class="text-xs">{{ annotation.label }}</div>
            <div class="text-xs text-gray-500">
              {{ new Date(annotation.createdAt).toLocaleString() }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PDF显示区域 -->
    <div class="flex flex-col gap-2 w-full overflow-y-auto mt-3 mb-3">
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

    <!-- 标注类型选择工具栏 -->
    <div
      v-if="PDFStore.showToolbar"
      class="fixed bg-white border rounded-lg shadow-lg p-2 z-50"
      :style="{
        left: PDFStore.toolbarPosition.x + 'px',
        top: PDFStore.toolbarPosition.y + 'px',
        transform: 'translate(-50%, -100%)',
      }"
    >
      <div class="text-xs text-gray-600 mb-2">选择标注类型：</div>
      <div class="flex gap-1">
        <ElButton size="small" type="primary" @click="handleTypeSelect('题目')"> 题目 </ElButton>
        <ElButton size="small" type="success" @click="handleTypeSelect('选项')"> 选项 </ElButton>
        <ElButton size="small" type="warning" @click="handleTypeSelect('答案')"> 答案 </ElButton>
        <ElButton size="small" type="info" @click="handleTypeSelect('图片')"> 图片 </ElButton>
        <ElButton size="small" @click="handleTypeSelect('自定义')"> 自定义 </ElButton>
      </div>
      <div class="mt-2">
        <ElButton size="small" @click="cancelAnnotation">取消</ElButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { PDFStore } from '@/main'
import { ElButton, ElInputNumber, ElMessage } from 'element-plus'
import type { Annotation, AnnotationType } from '@/stores/PDFStore'
import { watch } from 'vue'

useKeyboardShortcuts()

// 监听缩放变化，重新绘制所有页面的标注
watch(
  () => PDFStore.scale,
  () => {
    // 重新绘制所有可见页面的标注
    PDFStore.visiblePages.forEach((pageNum) => {
      PDFStore.drawPageAnnotations(pageNum)
    })
  },
)

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

    const observer = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          const page = Number((entry.target as HTMLCanvasElement).dataset.page)
          PDFStore.setPageVisible(page, entry.isIntersecting)
          if (entry.isIntersecting) {
            console.log(page, entry)
            await PDFStore.renderPage(page, entry.target as HTMLCanvasElement)
            // 渲染完成后绘制该页面的标注
            PDFStore.drawPageAnnotations(page)
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

// 选择标注
const selectAnnotation = (annotation: Annotation) => {
  PDFStore.selectAnnotation(annotation.id)
  // 重新绘制该页面以显示选中状态
  PDFStore.drawPageAnnotations(annotation.pageNumber)
}

// 处理标注类型选择
const handleTypeSelect = (type: AnnotationType) => {
  PDFStore.handleTypeSelected(type)
}

// 取消标注
const cancelAnnotation = () => {
  PDFStore.showToolbar = false
  PDFStore.pendingAnnotation = null
  // 重新绘制所有页面以清除临时矩形
  PDFStore.visiblePages.forEach((pageNum) => {
    PDFStore.drawPageAnnotations(pageNum)
  })
}
</script>

<style scoped></style>
