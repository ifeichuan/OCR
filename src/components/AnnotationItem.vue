<template>
  <div
    class="annotation-item-card"
    :class="{
      selected: isSelected,
      'multi-selected': isMultiSelected,
      default: !isSelected && !isMultiSelected,
    }"
    @click="$emit('click', annotation)"
  >
    <!-- 标注头部信息 -->
    <div class="annotation-header">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <el-icon size="14" color="#409EFF"><Document /></el-icon>
        <span class="page-info whitespace-nowrap">第{{ annotation.pageNumber }}页</span>
        <el-tag
          :type="getTypeTagType(annotation.type)"
          size="small"
          effect="light"
          class="type-tag flex-shrink-0"
        >
          {{ annotation.type }}
        </el-tag>
      </div>

      <el-select
        :model-value="annotation.type"
        size="small"
        class="type-selector flex-shrink-0"
        @change="(value: string) => updateAnnotationType(value as AnnotationType)"
      >
        <el-option-group label="问题相关">
          <el-option label="问题" value="问题">
            <el-icon class="mr-2"><QuestionFilled /></el-icon>问题
          </el-option>
          <el-option label="问题的图片" value="问题的图片">
            <el-icon class="mr-2"><Picture /></el-icon>问题的图片
          </el-option>
        </el-option-group>
        <el-option-group label="选项相关">
          <el-option label="选项" value="选项">
            <el-icon class="mr-2"><List /></el-icon>选项
          </el-option>
          <el-option label="选项的图片" value="选项的图片">
            <el-icon class="mr-2"><Picture /></el-icon>选项的图片
          </el-option>
        </el-option-group>
        <el-option-group label="答案相关">
          <el-option label="答案" value="答案">
            <el-icon class="mr-2"><Check /></el-icon>答案
          </el-option>
          <el-option label="答案的图片" value="答案的图片">
            <el-icon class="mr-2"><Picture /></el-icon>答案的图片
          </el-option>
        </el-option-group>
        <el-option-group label="其他内容">
          <el-option label="解析" value="解析">
            <el-icon class="mr-2"><Reading /></el-icon>解析
          </el-option>
          <el-option label="解析的图片" value="解析的图片">
            <el-icon class="mr-2"><Picture /></el-icon>解析的图片
          </el-option>
          <el-option label="其他" value="其他">
            <el-icon class="mr-2"><More /></el-icon>其他
          </el-option>
          <el-option label="其他的图片" value="其他的图片">
            <el-icon class="mr-2"><Picture /></el-icon>其他的图片
          </el-option>
        </el-option-group>
      </el-select>
    </div>

    <div v-if="annotation.thumbnail" class="mb-2">
      <img :src="annotation.thumbnail" class="max-w-full h-12 object-contain border" />
    </div>

    <!-- 文本内容编辑区域 - 图片类型不显示 -->
    <div v-if="!annotation.type.includes('图片')" class="mb-2">
      <ElInput
        v-if="!isEditing"
        :model-value="annotation.label"
        type="textarea"
        :rows="2"
        placeholder="点击查看详情..."
        readonly
        class="cursor-pointer"
        @click.stop="showModal"
      />
      <ElInput
        v-else
        v-model="editContent"
        type="textarea"
        :rows="3"
        placeholder="输入标注内容..."
        @blur="saveContent"
        @keydown.enter.ctrl="saveContent"
        @keydown.esc="cancelEdit"
        ref="textareaRef"
      />
      <div v-if="isEditing" class="text-xs text-gray-500 mt-1">Ctrl+Enter 保存，Esc 取消</div>
    </div>

    <!-- 标注详情弹窗 -->
    <ElDialog
      v-model="modalVisible"
      :title="`标注详情 - 第${annotation.pageNumber}页`"
      width="80%"
      :before-close="handleModalClose"
      append-to-body
    >
      <div class="modal-content">
        <!-- 标注类型和页面信息 -->
        <div class="modal-header mb-4">
          <div class="flex items-center gap-3 mb-3">
            <el-icon size="18" color="#409EFF"><Document /></el-icon>
            <span class="text-lg font-semibold">第{{ annotation.pageNumber }}页</span>
            <el-tag :type="getTypeTagType(annotation.type)" size="default" effect="light">
              {{ annotation.type }}
            </el-tag>
          </div>

          <!-- 类型选择器 -->
          <el-select
            :model-value="annotation.type"
            size="default"
            class="w-64"
            @change="(value: string) => updateAnnotationType(value as AnnotationType)"
          >
            <el-option-group label="问题相关">
              <el-option label="问题" value="问题">
                <el-icon class="mr-2"><QuestionFilled /></el-icon>问题
              </el-option>
              <el-option label="问题的图片" value="问题的图片">
                <el-icon class="mr-2"><Picture /></el-icon>问题的图片
              </el-option>
            </el-option-group>
            <el-option-group label="选项相关">
              <el-option label="选项" value="选项">
                <el-icon class="mr-2"><List /></el-icon>选项
              </el-option>
              <el-option label="选项的图片" value="选项的图片">
                <el-icon class="mr-2"><Picture /></el-icon>选项的图片
              </el-option>
            </el-option-group>
            <el-option-group label="答案相关">
              <el-option label="答案" value="答案">
                <el-icon class="mr-2"><Check /></el-icon>答案
              </el-option>
              <el-option label="答案的图片" value="答案的图片">
                <el-icon class="mr-2"><Picture /></el-icon>答案的图片
              </el-option>
            </el-option-group>
            <el-option-group label="其他内容">
              <el-option label="解析" value="解析">
                <el-icon class="mr-2"><Reading /></el-icon>解析
              </el-option>
              <el-option label="解析的图片" value="解析的图片">
                <el-icon class="mr-2"><Picture /></el-icon>解析的图片
              </el-option>
              <el-option label="其他" value="其他">
                <el-icon class="mr-2"><More /></el-icon>其他
              </el-option>
              <el-option label="其他的图片" value="其他的图片">
                <el-icon class="mr-2"><Picture /></el-icon>其他的图片
              </el-option>
            </el-option-group>
          </el-select>
        </div>

        <!-- 缩略图 -->
        <div v-if="annotation.thumbnail" class="mb-4">
          <div class="text-sm text-gray-600 mb-2">标注区域预览：</div>
          <img
            :src="annotation.thumbnail"
            class="max-w-full max-h-64 object-contain border rounded-lg shadow-sm"
          />
        </div>

        <!-- 文本内容编辑 -->
        <div v-if="!annotation.type.includes('图片')" class="mb-4">
          <div class="text-sm text-gray-600 mb-2">标注内容：</div>
          <ElInput
            v-model="modalEditContent"
            type="textarea"
            :rows="8"
            placeholder="输入标注内容..."
            class="modal-textarea"
          />
          <div class="text-xs text-gray-500 mt-2">
            创建时间：{{ new Date(annotation.createdAt).toLocaleString() }}
          </div>
        </div>

        <!-- 图片类型显示 -->
        <div v-else class="mb-4">
          <div class="text-sm text-gray-600 mb-2">标注内容：</div>
          <div class="p-3 bg-gray-50 rounded-lg">
            {{ annotation.label }}
          </div>
          <div class="text-xs text-gray-500 mt-2">
            创建时间：{{ new Date(annotation.createdAt).toLocaleString() }}
          </div>
        </div>

        <!-- 关联的子标注 -->
        <div v-if="childAnnotations.length > 0" class="mb-4">
          <div class="text-sm text-gray-600 mb-2">关联的图片标注：</div>
          <div class="space-y-2">
            <div
              v-for="child in childAnnotations"
              :key="child.id"
              class="flex items-center justify-between bg-blue-50 p-3 rounded-lg"
            >
              <div class="flex items-center gap-2">
                <el-icon><Picture /></el-icon>
                <span>{{ child.label }} (第{{ child.pageNumber }}页)</span>
              </div>
              <ElButton
                size="small"
                type="danger"
                text
                @click="emit('unlinkAnnotation', annotation.id, child.id)"
              >
                取消关联
              </ElButton>
            </div>
          </div>
        </div>

        <!-- 可关联的图片标注 -->
        <div
          v-if="!annotation.type.includes('图片') && availableChildAnnotations.length > 0"
          class="mb-4"
        >
          <div class="text-sm text-gray-600 mb-2">关联图片标注：</div>
          <ElSelect
            placeholder="选择要关联的图片标注"
            size="default"
            class="w-full"
            @change="(value: string) => emit('linkAnnotation', annotation.id, value)"
          >
            <ElOption
              v-for="child in availableChildAnnotations"
              :key="child.id"
              :label="`${child.label} (第${child.pageNumber}页)`"
              :value="child.id"
            />
          </ElSelect>
        </div>

        <!-- 父标注信息 -->
        <div v-if="annotation.parentId" class="mb-4">
          <div class="text-sm text-gray-600 mb-2">关联到：</div>
          <div class="p-3 bg-green-50 rounded-lg">
            {{ getParentAnnotation()?.label || '未知标注' }}
            <span v-if="getParentAnnotation()">(第{{ getParentAnnotation()?.pageNumber }}页)</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <div class="flex gap-2">
            <ElButton v-if="showRemoveButton" type="warning" @click="handleRemoveFromGroup">
              移出组
            </ElButton>
            <ElButton type="danger" @click="handleDeleteAnnotation"> 删除标注 </ElButton>
          </div>
          <div class="flex gap-2">
            <ElButton @click="handleModalClose">取消</ElButton>
            <ElButton type="primary" @click="handleSaveModal">保存</ElButton>
          </div>
        </div>
      </template>
    </ElDialog>

    <!-- 图片类型只显示标签 -->
    <div v-if="annotation.type.includes('图片')" class="text-xs mb-2">
      {{ annotation.label }}
    </div>

    <div class="text-xs text-gray-500 mb-2">
      {{ new Date(annotation.createdAt).toLocaleString() }}
    </div>

    <!-- 关联的子标注显示 -->
    <div v-if="childAnnotations.length > 0" class="mt-2 border-t pt-2">
      <div class="text-xs text-gray-600 mb-1">关联的图片标注:</div>
      <div class="space-y-1">
        <div
          v-for="child in childAnnotations"
          :key="child.id"
          class="flex items-center justify-between bg-gray-50 p-1 rounded text-xs"
        >
          <span>{{ child.label }} (第{{ child.pageNumber }}页)</span>
          <ElButton
            size="small"
            type="text"
            @click.stop="emit('unlinkAnnotation', annotation.id, child.id)"
          >
            取消关联
          </ElButton>
        </div>
      </div>
    </div>

    <!-- 关联操作区域 -->
    <div
      v-if="!annotation.type.includes('图片') && availableChildAnnotations.length > 0"
      class="mt-2 border-t pt-2"
    >
      <div class="text-xs text-gray-600 mb-1">可关联的图片标注:</div>
      <ElSelect
        placeholder="选择要关联的图片标注"
        size="small"
        class="w-full"
        @change="(value: string) => emit('linkAnnotation', annotation.id, value)"
      >
        <ElOption
          v-for="child in availableChildAnnotations"
          :key="child.id"
          :label="`${child.label} (第${child.pageNumber}页)`"
          :value="child.id"
        />
      </ElSelect>
    </div>

    <!-- 父标注显示 -->
    <div v-if="annotation.parentId" class="mt-2 border-t pt-2">
      <div class="text-xs text-gray-600">
        关联到: {{ getParentAnnotation()?.label || '未知标注' }}
        <span v-if="getParentAnnotation()">(第{{ getParentAnnotation()?.pageNumber }}页)</span>
      </div>
    </div>

    <!-- 操作按钮区域 -->
    <div class="absolute top-1 right-1 flex gap-1">
      <!-- 移出组按钮 -->
      <ElButton
        v-if="showRemoveButton"
        size="small"
        type="warning"
        @click.stop="$emit('removeFromGroup', annotation.id)"
      >
        移出组
      </ElButton>

      <!-- 删除标注按钮 -->
      <ElButton size="small" type="danger" @click.stop="$emit('deleteAnnotation', annotation.id)">
        删除
      </ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, onMounted } from 'vue'
import {
  ElButton,
  ElInput,
  ElSelect,
  ElOption,
  ElOptionGroup,
  ElTag,
  ElIcon,
  ElDialog,
} from 'element-plus'
import {
  Document,
  QuestionFilled,
  Picture,
  List,
  Check,
  Reading,
  More,
} from '@element-plus/icons-vue'
import type { Annotation, AnnotationType } from '@/stores/PDFStore'
import { PDFStore } from '@/main'
import { callOCR } from '@/stores/AIOCR'

interface Props {
  annotation: Annotation
  isSelected: boolean
  isMultiSelected: boolean
  isGroupMode: boolean
  showRemoveButton: boolean
}

interface Emits {
  (e: 'click', annotation: Annotation): void
  (e: 'removeFromGroup', annotationId: string): void
  (e: 'updateContent', annotationId: string, content: string): void
  (e: 'deleteAnnotation', annotationId: string): void
  (e: 'updateAnnotationType', annotationId: string, type: AnnotationType): void
  (e: 'linkAnnotation', parentId: string, childId: string): void
  (e: 'unlinkAnnotation', parentId: string, childId: string): void
}
// 获取props和emit
const props = defineProps<Props>()
onMounted(async () => {
  if (props.annotation.type.includes('图片')) {
  } else {
    console.log(props.annotation.thumbnail)
    const text = await callOCR(props.annotation.thumbnail as string)
    emit('updateContent', props.annotation.id, text)
  }
})
const emit = defineEmits<{
  click: [annotation: Annotation]
  removeFromGroup: [annotationId: string]
  updateContent: [annotationId: string, content: string]
  deleteAnnotation: [annotationId: string]
  updateAnnotationType: [annotationId: string, type: AnnotationType]
  linkAnnotation: [parentId: string, childId: string]
  unlinkAnnotation: [parentId: string, childId: string]
}>()

// 编辑状态
const isEditing = ref(false)
const editContent = ref('')
const textareaRef = ref()

// 弹窗状态
const modalVisible = ref(false)
const modalEditContent = ref('')

const startEditing = () => {
  if (props.annotation.type.includes('图片')) return

  isEditing.value = true
  editContent.value = props.annotation.label

  nextTick(() => {
    textareaRef.value?.focus()
  })
}

const saveContent = () => {
  if (editContent.value.trim() !== props.annotation.label) {
    emit('updateContent', props.annotation.id, editContent.value.trim())
  }
  isEditing.value = false
}

const cancelEdit = () => {
  isEditing.value = false
  editContent.value = ''
}

const updateAnnotationType = (type: AnnotationType) => {
  emit('updateAnnotationType', props.annotation.id, type)
}

// 计算属性：获取子标注
const childAnnotations = computed(() => {
  return PDFStore.getChildAnnotations(props.annotation.id)
})

// 计算属性：获取可关联的子标注
const availableChildAnnotations = computed(() => {
  return PDFStore.getAvailableChildAnnotations(props.annotation.id)
})

// 获取父标注
const getParentAnnotation = () => {
  if (!props.annotation.parentId) return null
  return PDFStore.annotations.find((a: Annotation) => a.id === props.annotation.parentId)
}

// 显示弹窗
const showModal = () => {
  modalVisible.value = true
  modalEditContent.value = props.annotation.label
}

// 关闭弹窗
const handleModalClose = () => {
  modalVisible.value = false
  modalEditContent.value = ''
}

// 保存弹窗内容
const handleSaveModal = () => {
  if (modalEditContent.value.trim() !== props.annotation.label) {
    emit('updateContent', props.annotation.id, modalEditContent.value.trim())
  }
  modalVisible.value = false
}

// 处理移出组操作
const handleRemoveFromGroup = () => {
  emit('removeFromGroup', props.annotation.id)
  modalVisible.value = false
}

// 处理删除标注操作
const handleDeleteAnnotation = () => {
  emit('deleteAnnotation', props.annotation.id)
  modalVisible.value = false
}

// 根据标注类型获取标签类型
const getTypeTagType = (type: AnnotationType) => {
  if (type.includes('问题')) return 'primary'
  if (type.includes('选项')) return 'success'
  if (type.includes('答案')) return 'warning'
  if (type.includes('解析')) return 'info'
  return 'info'
}
</script>

<style scoped>
.annotation-item-card {
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  position: relative;
  overflow: hidden;
}

.annotation-item-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #67c23a, #e6a23c, #f56c6c);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.annotation-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: #409eff;
}

.annotation-item-card:hover::before {
  opacity: 1;
}

.annotation-item-card.selected {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-color: #2196f3;
  box-shadow: 0 4px 20px rgba(33, 150, 243, 0.3);
}

.annotation-item-card.multi-selected {
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
  border-color: #4caf50;
  box-shadow: 0 4px 20px rgba(76, 175, 80, 0.3);
}

.annotation-item-card.default {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
}

.annotation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
  gap: 8px;
}

.page-info {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
  background: #f8f9fa;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid #dee2e6;
  min-width: fit-content;
}

.type-tag {
  font-weight: 500 !important;
  border-radius: 6px !important;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-selector {
  min-width: 120px;
  max-width: 140px;
}

:deep(.type-selector .el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.2s ease;
}

:deep(.type-selector .el-input__wrapper:hover) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 缩略图样式 */
.annotation-item-card img {
  border-radius: 6px;
  border: 2px solid #e9ecef;
  transition: all 0.2s ease;
}

.annotation-item-card img:hover {
  border-color: #409eff;
  transform: scale(1.05);
}

/* 文本编辑区域样式 */
:deep(.el-textarea) {
  border-radius: 8px;
}

:deep(.el-textarea__inner) {
  border-radius: 8px;
  transition: all 0.2s ease;
}

:deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.cursor-pointer :deep(.el-textarea__inner) {
  cursor: pointer;
  background: #f8f9fa;
}

.cursor-pointer :deep(.el-textarea__inner:hover) {
  background: #e9ecef;
  border-color: #409eff;
}

/* 关联标注区域样式 */
.annotation-item-card .border-t {
  border-color: #e9ecef !important;
  margin-top: 12px;
  padding-top: 12px;
}

.annotation-item-card .bg-gray-50 {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  transition: all 0.2s ease;
}

.annotation-item-card .bg-gray-50:hover {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
  border-color: #409eff;
}

/* 操作按钮区域样式 */
.annotation-item-card .absolute {
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: all 0.2s ease;
}

.annotation-item-card:hover .absolute {
  opacity: 1;
}

:deep(.el-button--small) {
  border-radius: 6px !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
}

:deep(.el-button--small:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* 时间戳样式 */
.annotation-item-card .text-xs.text-gray-500 {
  color: #8e9aaf !important;
  font-weight: 400;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

/* 选择器下拉样式优化 */
:deep(.el-select-dropdown) {
  border-radius: 12px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
}

:deep(.el-option-group__title) {
  font-weight: 600 !important;
  color: #409eff !important;
  padding: 8px 12px !important;
}

:deep(.el-option) {
  border-radius: 6px !important;
  margin: 2px 8px !important;
  transition: all 0.2s ease !important;
}

:deep(.el-option:hover) {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .annotation-item-card {
    padding: 12px;
    border-radius: 8px;
  }

  .annotation-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .type-selector {
    min-width: 120px;
    width: 100%;
  }

  .annotation-item-card .absolute {
    position: static;
    opacity: 1;
    margin-top: 8px;
    justify-content: flex-end;
  }
}

/* 动画效果 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.annotation-item-card {
  animation: slideIn 0.3s ease-out;
}

/* 保持亮色主题，移除深色模式支持 */
.annotation-item-card {
  /* 确保始终使用亮色背景 */
  color: #374151;
}

.page-info {
  /* 确保页面信息始终使用亮色背景 */
  background: #f8f9fa !important;
  color: #6c757d !important;
  border-color: #dee2e6 !important;
}

.cursor-pointer :deep(.el-textarea__inner) {
  /* 确保文本区域始终使用亮色背景 */
  background: #f8f9fa !important;
  color: #374151 !important;
}

/* 关联标注区域确保亮色背景 */
.annotation-item-card .bg-gray-50 {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
  color: #374151 !important;
}

/* 时间戳区域确保亮色背景 */
.annotation-item-card .text-xs.text-gray-500 {
  background: #f8f9fa !important;
  color: #8e9aaf !important;
}

/* 弹窗样式 */
:deep(.el-dialog) {
  border-radius: 12px !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
}

:deep(.el-dialog__header) {
  padding: 20px 24px 16px !important;
  border-bottom: 1px solid #e9ecef !important;
}

:deep(.el-dialog__title) {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #374151 !important;
}

:deep(.el-dialog__body) {
  padding: 24px !important;
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px 20px !important;
  border-top: 1px solid #e9ecef !important;
}

.modal-content {
  color: #374151;
}

.modal-textarea :deep(.el-textarea__inner) {
  border-radius: 8px !important;
  border: 2px solid #e9ecef !important;
  transition: all 0.2s ease !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
}

.modal-textarea :deep(.el-textarea__inner:focus) {
  border-color: #409eff !important;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1) !important;
}

/* 弹窗内的背景色样式 */
.modal-content .bg-gray-50 {
  background: #f8f9fa !important;
  border: 1px solid #e9ecef !important;
}

.modal-content .bg-blue-50 {
  background: #e3f2fd !important;
  border: 1px solid #bbdefb !important;
}

.modal-content .bg-green-50 {
  background: #e8f5e8 !important;
  border: 1px solid #c8e6c9 !important;
}
</style>
