<template>
  <div class="flex gap-3 h-screen relative">
    <!-- 左侧面板 -->
    <div class="bg-amber-200 flex gap-3 flex-col p-3 w-80 shrink-0 overflow-y-auto">
      <ElButton @click="selectFile">上传文件</ElButton>
      <ElInputNumber v-model="PDFStore.scale" :step="0.1" :max="5" :min="0.5"></ElInputNumber>

      <!-- 标注列表组件 -->
      <AnnotationList />
    </div>

    <!-- PDF显示区域 -->
    <div class="flex flex-col gap-2 w-full overflow-y-auto">
      <div
        v-for="pageNum in PDFStore.totalPages"
        :key="pageNum"
        class="border rounded-2xl p-1 relative m-auto mt-5 mb-5"
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

    <!-- 标注类型选择 Popover -->
    <ElPopover
      :visible="PDFStore.showToolbar"
      placement="top"
      :width="280"
      :virtual-ref="toolbarVirtualRef"
      virtual-triggering
      @hide="cancelAnnotation"
    >
      <div class="p-2">
        <div class="text-sm font-medium text-gray-700 mb-3">选择标注类型</div>
        <div class="grid grid-cols-2 gap-2">
          <ElButton size="small" type="primary" @click="handleTypeSelect('问题')"> 问题 </ElButton>
          <ElButton size="small" type="primary" @click="handleTypeSelect('问题的图片')">
            问题图片
          </ElButton>
          <ElButton size="small" type="success" @click="handleTypeSelect('选项')"> 选项 </ElButton>
          <ElButton size="small" type="success" @click="handleTypeSelect('选项的图片')">
            选项图片
          </ElButton>
          <ElButton size="small" type="warning" @click="handleTypeSelect('答案')"> 答案 </ElButton>
          <ElButton size="small" type="warning" @click="handleTypeSelect('答案的图片')">
            答案图片
          </ElButton>
          <ElButton size="small" type="info" @click="handleTypeSelect('其他')"> 其他 </ElButton>
          <ElButton size="small" type="info" @click="handleTypeSelect('其他的图片')">
            其他图片
          </ElButton>
          <ElButton size="small" @click="handleTypeSelect('解析')"> 解析 </ElButton>
          <ElButton size="small" @click="handleTypeSelect('解析的图片')"> 解析图片 </ElButton>
        </div>
        <div class="mt-3 text-center">
          <ElButton size="small" @click="cancelAnnotation">取消</ElButton>
        </div>
      </div>
    </ElPopover>
  </div>
</template>

<script setup lang="ts">
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { PDFStore } from '@/main'
import { ElButton, ElInputNumber, ElMessage, ElPopover } from 'element-plus'
import type { AnnotationType } from '@/stores/PDFStore'
import { watch, computed } from 'vue'
import AnnotationList from '@/components/AnnotationList.vue'

useKeyboardShortcuts()

// 创建虚拟引用用于 Popover 定位
const toolbarVirtualRef = computed(() => ({
  getBoundingClientRect: () => ({
    left: PDFStore.toolbarPosition.x,
    top: PDFStore.toolbarPosition.y,
    right: PDFStore.toolbarPosition.x,
    bottom: PDFStore.toolbarPosition.y,
    width: 0,
    height: 0,
  }),
}))

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
