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
    <div class="flex items-center justify-between mb-1">
      <div class="text-xs text-gray-600">第{{ annotation.pageNumber }}页</div>
      <ElSelect
        :model-value="annotation.type"
        size="small"
        class="w-32"
        @change="(value: string) => updateAnnotationType(value as AnnotationType)"
      >
        <ElOption label="问题" value="问题" />
        <ElOption label="问题的图片" value="问题的图片" />
        <ElOption label="选项" value="选项" />
        <ElOption label="选项的图片" value="选项的图片" />
        <ElOption label="答案" value="答案" />
        <ElOption label="答案的图片" value="答案的图片" />
        <ElOption label="其他" value="其他" />
        <ElOption label="其他的图片" value="其他的图片" />
        <ElOption label="解析" value="解析" />
        <ElOption label="解析的图片" value="解析的图片" />
      </ElSelect>
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
import { ElButton, ElInput, ElSelect, ElOption } from 'element-plus'
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
  return PDFStore.annotations.find((a) => a.id === props.annotation.parentId)
}
</script>

<style scoped>
.cursor-pointer :deep(.el-textarea__inner) {
  cursor: pointer;
}
</style>
