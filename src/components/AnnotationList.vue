<template>
  <div v-if="PDFStore.annotations.length > 0" class="mt-4">
    <!-- 编组模式切换 -->
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-bold">标注列表</h3>
      <ElButton
        size="small"
        :type="PDFStore.isGroupMode ? 'primary' : 'default'"
        @click="toggleGroupMode"
      >
        {{ PDFStore.isGroupMode ? '退出编组' : '编组模式' }}
      </ElButton>
    </div>

    <!-- 编组模式下的操作按钮 -->
    <div v-if="PDFStore.isGroupMode && PDFStore.selectedAnnotations.size > 0" class="mb-3">
      <div class="flex gap-2">
        <ElInput
          v-model="groupName"
          placeholder="输入组名，如：题目1"
          size="small"
          class="flex-1"
        />
        <ElButton size="small" type="primary" @click="createNewGroup"> 创建组 </ElButton>
        <ElButton size="small" @click="clearSelection"> 清除选择 </ElButton>
      </div>
      <div class="text-xs text-gray-500 mt-1">
        已选择 {{ PDFStore.selectedAnnotations.size }} 个标注
      </div>
    </div>

    <!-- 分组显示标注 -->
    <div class="space-y-3">
      <!-- 显示分组 -->
      <div v-for="group in PDFStore.annotationGroups" :key="group.id" class="border rounded-lg p-2">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: group.color }"></div>
            <span class="text-sm font-medium">{{ group.name }}</span>
            <span class="text-xs text-gray-500">({{ group.annotationIds.length }}个)</span>
          </div>
          <ElButton size="small" type="danger" @click="deleteGroup(group.id)"> 删除组 </ElButton>
        </div>

        <div class="space-y-1 ml-5">
          <AnnotationItem
            v-for="annotation in getGroupAnnotations(group.id)"
            :key="annotation.id"
            :annotation="annotation"
            :is-selected="annotation.id === PDFStore.selectedAnnotation"
            :is-multi-selected="
              PDFStore.isGroupMode && PDFStore.selectedAnnotations.has(annotation.id)
            "
            :is-group-mode="PDFStore.isGroupMode"
            :show-remove-button="true"
            @click="handleAnnotationClick"
            @remove-from-group="removeFromGroup"
            @update-content="updateAnnotationContent"
          />
        </div>
      </div>

      <!-- 显示未分组的标注 -->
      <div v-if="ungroupedAnnotations.length > 0">
        <h4 class="text-sm font-medium text-gray-600 mb-2">未分组标注</h4>
        <div class="space-y-1">
          <AnnotationItem
            v-for="annotation in ungroupedAnnotations"
            :key="annotation.id"
            :annotation="annotation"
            :is-selected="annotation.id === PDFStore.selectedAnnotation"
            :is-multi-selected="
              PDFStore.isGroupMode && PDFStore.selectedAnnotations.has(annotation.id)
            "
            :is-group-mode="PDFStore.isGroupMode"
            :show-remove-button="false"
            @click="handleAnnotationClick"
            @update-content="updateAnnotationContent"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElButton, ElInput, ElMessage } from 'element-plus'
import { PDFStore } from '@/main'
import type { Annotation } from '@/stores/PDFStore'
import AnnotationItem from './AnnotationItem.vue'

// 编组相关状态
const groupName = ref('')

// 计算属性：获取未分组的标注
const ungroupedAnnotations = computed(() => {
  const { ungrouped } = PDFStore.getGroupedAnnotations()
  return ungrouped
})

// 编组功能方法
const toggleGroupMode = () => {
  PDFStore.isGroupMode = !PDFStore.isGroupMode
  if (!PDFStore.isGroupMode) {
    PDFStore.clearAnnotationSelection()
  }
}

const handleAnnotationClick = (annotation: Annotation) => {
  if (PDFStore.isGroupMode) {
    // 编组模式下，切换选择状态
    PDFStore.toggleAnnotationSelection(annotation.id)
  } else {
    // 普通模式下，选择标注
    PDFStore.selectAnnotation(annotation.id)
    // 重新绘制该页面以显示选中状态
    PDFStore.drawPageAnnotations(annotation.pageNumber)
  }
}

const createNewGroup = () => {
  if (!groupName.value.trim()) {
    ElMessage.error('请输入组名!')
    return
  }

  const group = PDFStore.createGroup(groupName.value.trim())
  if (group) {
    ElMessage.success(`成功创建组: ${group.name}`)
    groupName.value = ''
  } else {
    ElMessage.error('请先选择要分组的标注!')
  }
}

const clearSelection = () => {
  PDFStore.clearAnnotationSelection()
}

const deleteGroup = (groupId: string) => {
  PDFStore.deleteGroup(groupId)
  ElMessage.success('已删除组')
}

const removeFromGroup = (annotationId: string) => {
  PDFStore.removeFromGroup(annotationId)
  ElMessage.success('已移出组')
}

const getGroupAnnotations = (groupId: string) => {
  const group = PDFStore.annotationGroups.find((g) => g.id === groupId)
  if (!group) return []

  return group.annotationIds
    .map((id) => PDFStore.annotations.find((a) => a.id === id))
    .filter(Boolean) as Annotation[]
}

const updateAnnotationContent = (annotationId: string, content: string) => {
  const annotation = PDFStore.annotations.find((a) => a.id === annotationId)
  if (annotation) {
    annotation.label = content
  }
}
</script>
