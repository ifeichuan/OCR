<template>
  <div
    class="border rounded p-2 cursor-pointer hover:bg-gray-50 relative"
    :class="{
      'bg-blue-100': isSelected,
      'bg-green-100': isMultiSelected,
      'bg-yellow-100': !isSelected && !isMultiSelected,
    }"
    @click="$emit('click', annotation)"
  >
    <div class="text-xs text-gray-600 mb-1">
      第{{ annotation.pageNumber }}页 - {{ annotation.type }}
    </div>

    <div v-if="annotation.thumbnail" class="mb-2">
      <img :src="annotation.thumbnail" class="max-w-full h-12 object-contain border" />
    </div>

    <!-- 文本内容编辑区域 - 图片类型不显示 -->
    <div v-if="annotation.type !== '图片'" class="mb-2">
      <ElInput
        v-if="!isEditing"
        :model-value="annotation.label"
        type="textarea"
        :rows="2"
        placeholder="点击编辑内容..."
        readonly
        class="cursor-pointer"
        @click.stop="startEditing"
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

    <!-- 图片类型只显示标签 -->
    <div v-else class="text-xs mb-2">
      {{ annotation.label }}
    </div>

    <div class="text-xs text-gray-500 mb-2">
      {{ new Date(annotation.createdAt).toLocaleString() }}
    </div>

    <!-- 移出组按钮 -->
    <ElButton
      v-if="showRemoveButton"
      size="small"
      type="warning"
      class="absolute top-1 right-1"
      @click.stop="$emit('removeFromGroup', annotation.id)"
    >
      移出组
    </ElButton>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ElButton, ElInput } from 'element-plus'
import type { Annotation } from '@/stores/PDFStore'

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
}

// 获取props和emit
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 编辑状态
const isEditing = ref(false)
const editContent = ref('')
const textareaRef = ref()

const startEditing = () => {
  if (props.annotation.type === '图片') return

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
</script>

<style scoped>
.cursor-pointer :deep(.el-textarea__inner) {
  cursor: pointer;
}
</style>
