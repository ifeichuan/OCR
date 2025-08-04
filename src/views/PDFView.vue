<template>
  <div class="flex gap-4 h-screen relative bg-gray-50">
    <!-- 左侧面板 -->
    <div class="bg-white shadow-lg rounded-r-lg flex flex-col w-100 shrink-0 overflow-hidden">
      <!-- 顶部工具栏 -->
      <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        <h1 class="text-lg font-bold mb-3 flex items-center">
          <el-icon class="mr-2"><Document /></el-icon>
          PDF 标注工具
        </h1>
        <div class="space-y-3">
          <el-button type="primary" size="default" @click="selectFile" class="w-full">
            <el-icon class="mr-2"><Upload /></el-icon>
            上传PDF文件
          </el-button>

          <!-- 缩放控制区域 -->
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <el-icon><ZoomIn /></el-icon>
              <span class="text-sm">缩放:</span>
              <el-input-number
                v-model="PDFStore.scale"
                :step="0.1"
                :max="5"
                :min="0.5"
                size="small"
                class="w-full"
                controls-position="right"
              />
            </div>
            <el-button size="small" @click="resetZoom" class="w-full" type="info" plain>
              <el-icon class="mr-1"><Refresh /></el-icon>
              复位缩放 (1:1)
            </el-button>
          </div>

          <!-- 快捷键提示 -->
          <div class="bg-blue-400 bg-opacity-30 rounded-lg p-3 text-xs">
            <div class="font-medium mb-2 flex items-center">
              <el-icon class="mr-1"><Key /></el-icon>
              快捷键提示
            </div>
            <div class="space-y-1 text-blue-100">
              <div>• Ctrl + 滚轮: 缩放</div>
              <div>• 鼠标拖拽: 创建标注</div>
              <div>• Esc: 取消当前操作</div>
              <div>• Delete: 删除选中标注</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 标注列表区域 -->
      <div class="flex-1 overflow-y-auto p-4">
        <AnnotationList />
      </div>
    </div>

    <!-- PDF显示区域 -->
    <div class="flex-1 overflow-auto bg-white p-6">
      <div v-if="PDFStore.totalPages === 0" class="flex items-center justify-center h-full">
        <el-empty description="请上传PDF文件开始标注" :image-size="200">
          <template #image>
            <el-icon size="100" color="#409EFF"><Document /></el-icon>
          </template>
          <el-button type="primary" @click="selectFile">
            <el-icon class="mr-2"><Upload /></el-icon>
            选择PDF文件
          </el-button>
        </el-empty>
      </div>

      <div v-else class="flex flex-col gap-6 min-w-fit">
        <div
          v-for="pageNum in PDFStore.totalPages"
          :key="pageNum"
          class="bg-gray-50 shadow-md rounded-lg p-4 relative hover:shadow-lg transition-shadow duration-300 border border-gray-200"
        >
          <!-- 页面标题 -->
          <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-300">
            <div class="flex items-center gap-3 min-w-0">
              <el-icon color="#409EFF" size="16"><Document /></el-icon>
              <span class="text-sm font-semibold text-gray-800 whitespace-nowrap">
                第 {{ pageNum }} 页
              </span>
              <el-divider direction="vertical" class="!mx-2" />
              <el-tag size="small" type="primary" effect="light">
                {{ Math.round(PDFStore.scale * 100) }}%
              </el-tag>
            </div>
            <div class="flex items-center gap-2">
              <el-tag size="small" type="info" effect="plain">
                {{ PDFStore.annotations.filter((a) => a.pageNumber === pageNum).length }} 个标注
              </el-tag>
            </div>
          </div>

          <!-- PDF页面内容 -->
          <div class="flex justify-center overflow-auto">
            <div
              class="relative border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm bg-white"
            >
              <canvas
                :ref="(el) => PDFStore.setCanvasRef(el, pageNum)"
                :data-page="pageNum"
              ></canvas>
              <canvas
                :ref="(el) => PDFStore.setOverlayCanvasRef(el, pageNum)"
                :data-page="pageNum"
                class="absolute left-0 top-0 pointer-events-auto cursor-crosshair"
                style="z-index: 10"
                @mousedown="(e) => PDFStore.handleMouseDown(e, pageNum)"
                @mousemove="(e) => PDFStore.handleMouseMove(e, pageNum)"
                @mouseup="(e) => PDFStore.handleMouseUp(e, pageNum)"
              ></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 标注类型选择 Popover -->
    <ElPopover
      :visible="PDFStore.showToolbar"
      placement="top"
      :width="320"
      :virtual-ref="toolbarVirtualRef"
      virtual-triggering
      @hide="cancelAnnotation"
      popper-class="annotation-toolbar-popover"
    >
      <div class="p-4">
        <div class="flex items-center gap-2 mb-4">
          <el-icon color="#409EFF"><Edit /></el-icon>
          <span class="text-base font-semibold text-gray-800">选择标注类型</span>
        </div>

        <div class="space-y-3">
          <!-- 问题类型 -->
          <div class="annotation-type-group">
            <div class="text-xs text-gray-500 mb-2 font-medium">问题相关</div>
            <div class="grid grid-cols-2 gap-2">
              <el-button
                size="small"
                type="primary"
                @click="handleTypeSelect('问题')"
                class="annotation-btn"
              >
                <el-icon class="mr-1"><QuestionFilled /></el-icon>
                问题
              </el-button>
              <el-button
                size="small"
                type="primary"
                plain
                @click="handleTypeSelect('问题的图片')"
                class="annotation-btn"
              >
                <el-icon class="mr-1"><Picture /></el-icon>
                问题图片
              </el-button>
            </div>
          </div>

          <!-- 选项类型 -->
          <div class="annotation-type-group">
            <div class="text-xs text-gray-500 mb-2 font-medium">选项相关</div>
            <div class="grid grid-cols-2 gap-2">
              <el-button
                size="small"
                type="success"
                @click="handleTypeSelect('选项')"
                class="annotation-btn"
              >
                <el-icon class="mr-1"><List /></el-icon>
                选项
              </el-button>
              <el-button
                size="small"
                type="success"
                plain
                @click="handleTypeSelect('选项的图片')"
                class="annotation-btn"
              >
                <el-icon class="mr-1"><Picture /></el-icon>
                选项图片
              </el-button>
            </div>
          </div>

          <!-- 答案类型 -->
          <div class="annotation-type-group">
            <div class="text-xs text-gray-500 mb-2 font-medium">答案相关</div>
            <div class="grid grid-cols-2 gap-2">
              <el-button
                size="small"
                type="warning"
                @click="handleTypeSelect('答案')"
                class="annotation-btn"
              >
                <el-icon class="mr-1"><Check /></el-icon>
                答案
              </el-button>
              <el-button
                size="small"
                type="warning"
                plain
                @click="handleTypeSelect('答案的图片')"
                class="annotation-btn"
              >
                <el-icon class="mr-1"><Picture /></el-icon>
                答案图片
              </el-button>
            </div>
          </div>

          <!-- 其他类型 -->
          <div class="annotation-type-group">
            <div class="text-xs text-gray-500 mb-2 font-medium">其他内容</div>
            <div class="grid grid-cols-2 gap-2">
              <el-button
                size="small"
                type="info"
                @click="handleTypeSelect('解析')"
                class="annotation-btn"
              >
                <el-icon class="mr-1"><Reading /></el-icon>
                解析
              </el-button>
              <el-button
                size="small"
                type="info"
                plain
                @click="handleTypeSelect('解析的图片')"
                class="annotation-btn"
              >
                <el-icon class="mr-1"><Picture /></el-icon>
                解析图片
              </el-button>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <el-button size="small" @click="handleTypeSelect('其他')" class="annotation-btn">
                <el-icon class="mr-1"><More /></el-icon>
                其他
              </el-button>
              <el-button
                size="small"
                plain
                @click="handleTypeSelect('其他的图片')"
                class="annotation-btn"
              >
                <el-icon class="mr-1"><Picture /></el-icon>
                其他图片
              </el-button>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-gray-200 text-center">
          <el-button size="small" @click="cancelAnnotation">
            <el-icon class="mr-1"><Close /></el-icon>
            取消
          </el-button>
        </div>
      </div>
    </ElPopover>
  </div>
</template>

<script setup lang="ts">
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { PDFStore } from '@/main'
import {
  ElButton,
  ElInputNumber,
  ElMessage,
  ElPopover,
  ElEmpty,
  ElTag,
  ElIcon,
  ElDivider,
} from 'element-plus'
import {
  Document,
  Upload,
  ZoomIn,
  Edit,
  QuestionFilled,
  Picture,
  List,
  Check,
  Reading,
  More,
  Close,
  Refresh,
  Key,
} from '@element-plus/icons-vue'
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

// 复位缩放
const resetZoom = () => {
  PDFStore.scale = 1.0
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

<style scoped>
:deep(.annotation-toolbar-popover) {
  border-radius: 12px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
}

.annotation-type-group {
  padding: 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  border: 1px solid #dee2e6;
  transition: all 0.2s ease;
}

.annotation-type-group:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.annotation-btn {
  border-radius: 8px !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
  position: relative;
  overflow: hidden;
}

.annotation-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.annotation-btn:active {
  transform: translateY(0);
}

/* 左侧面板滚动条美化 */
.flex-1.overflow-y-auto.p-4::-webkit-scrollbar {
  width: 6px;
}

.flex-1.overflow-y-auto.p-4::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.flex-1.overflow-y-auto.p-4::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.flex-1.overflow-y-auto.p-4::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* PDF区域滚动条美化 */
.flex-1.overflow-auto::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.flex-1.overflow-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.flex-1.overflow-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.flex-1.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.flex-1.overflow-auto::-webkit-scrollbar-corner {
  background: #f1f1f1;
}

/* 页面卡片动画效果 */
.bg-gray-50.shadow-md.rounded-lg {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bg-gray-50.shadow-md.rounded-lg:hover {
  transform: translateY(-2px);
}

/* 页面内容区域样式 */
.min-w-fit {
  min-width: max-content;
}

/* 页面标题优化 */
.border-b.border-gray-300 {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px 8px 0 0;
  margin: -16px -16px 12px -16px;
  padding: 12px 16px 8px 16px;
}

/* 输入框样式优化 */
:deep(.el-input-number) {
  border-radius: 6px;
}

:deep(.el-input-number .el-input__wrapper) {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
}

/* 按钮样式优化 */
:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

:deep(.el-button:hover) {
  transform: translateY(-1px);
}

/* 标签样式优化 */
:deep(.el-tag) {
  border-radius: 6px;
  font-weight: 500;
}

/* 空状态样式优化 */
:deep(.el-empty) {
  padding: 60px 0;
}

:deep(.el-empty__description) {
  font-size: 16px;
  color: #909399;
  margin-top: 20px;
}
</style>
