<template>
  <div v-if="PDFStore.annotations.length > 0" class="annotation-list-container">
    <!-- 标题和操作区域 -->
    <div class="list-header">
      <div class="flex items-center gap-2 mb-3">
        <el-icon color="#409EFF" size="18"><Collection /></el-icon>
        <h3 class="text-base font-semibold text-gray-800">标注列表</h3>
        <el-badge :value="PDFStore.annotations.length" class="ml-2" type="primary" />
      </div>

      <div class="flex flex-col gap-2 mb-4">
        <el-button size="small" type="success" @click="exportToQuestionBank" class="action-btn">
          <el-icon class="mr-1"><Download /></el-icon>
          导出题库
        </el-button>
        <el-button
          size="small"
          :type="PDFStore.isGroupMode ? 'primary' : 'default'"
          @click="toggleGroupMode"
          class="action-btn"
        >
          <el-icon class="mr-1">
            <component :is="PDFStore.isGroupMode ? 'Close' : 'Connection'" />
          </el-icon>
          {{ PDFStore.isGroupMode ? '退出编组' : '编组模式' }}
        </el-button>
      </div>
    </div>

    <!-- 编组模式下的操作区域 -->
    <div
      v-if="PDFStore.isGroupMode && PDFStore.selectedAnnotations.size > 0"
      class="group-mode-panel"
    >
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div class="flex items-center gap-2 mb-2">
          <el-icon color="#409EFF"><Edit /></el-icon>
          <span class="text-sm font-medium text-blue-800">创建新组</span>
        </div>

        <div class="flex gap-2 mb-2">
          <el-input
            v-model="groupName"
            placeholder="输入组名，如：题目1"
            size="small"
            class="flex-1"
          >
            <template #prefix>
              <el-icon><Folder /></el-icon>
            </template>
          </el-input>
          <el-button size="small" type="primary" @click="createNewGroup" class="action-btn">
            <el-icon class="mr-1"><Plus /></el-icon>
            创建组
          </el-button>
        </div>

        <div class="flex items-center justify-between">
          <div class="text-xs text-blue-600 flex items-center gap-1">
            <el-icon size="12"><Select /></el-icon>
            已选择 {{ PDFStore.selectedAnnotations.size }} 个标注
          </div>
          <el-button size="small" @click="clearSelection" class="action-btn">
            <el-icon class="mr-1"><Close /></el-icon>
            清除选择
          </el-button>
        </div>
      </div>
    </div>

    <!-- 分组显示标注 -->
    <div class="annotations-container space-y-4">
      <!-- 显示分组 -->
      <div v-for="group in PDFStore.annotationGroups" :key="group.id" class="group-card">
        <div class="group-header">
          <div class="flex items-center gap-3">
            <div
              class="w-4 h-4 rounded-full shadow-sm border-2 border-white"
              :style="{ backgroundColor: group.color }"
            ></div>
            <div class="flex-1">
              <span class="text-sm font-semibold text-gray-800">{{ group.name }}</span>
              <el-tag size="small" type="info" class="ml-2">
                {{ group.annotationIds.length }}个标注
              </el-tag>
            </div>
          </div>
          <el-button
            size="small"
            type="danger"
            plain
            @click="deleteGroup(group.id)"
            class="delete-group-btn"
          >
            <el-icon class="mr-1"><Delete /></el-icon>
            删除组
          </el-button>
        </div>

        <div class="group-content">
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
            @delete-annotation="deleteAnnotation"
            @update-annotation-type="updateAnnotationType"
            @link-annotation="linkAnnotations"
            @unlink-annotation="unlinkAnnotations"
          />
        </div>
      </div>

      <!-- 显示未分组的标注 -->
      <div v-if="ungroupedAnnotations.length > 0" class="ungrouped-section">
        <div class="ungrouped-header">
          <div class="flex items-center gap-2 mb-3">
            <el-icon color="#909399" size="16"><Files /></el-icon>
            <h4 class="text-sm font-medium text-gray-600">未分组标注</h4>
            <el-tag size="small" type="info" effect="plain">
              {{ ungroupedAnnotations.length }}个
            </el-tag>
          </div>
        </div>

        <div class="ungrouped-content space-y-2">
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
            @delete-annotation="deleteAnnotation"
            @update-annotation-type="updateAnnotationType"
            @link-annotation="linkAnnotations"
            @unlink-annotation="unlinkAnnotations"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElButton, ElInput, ElMessage, ElMessageBox, ElIcon, ElBadge, ElTag } from 'element-plus'
import {
  Collection,
  Download,
  Connection,
  Close,
  Edit,
  Folder,
  Plus,
  Select,
  Delete,
  Files,
} from '@element-plus/icons-vue'
import { PDFStore } from '@/main'
import type { Annotation, AnnotationType } from '@/stores/PDFStore'
import AnnotationItem from '@/components/AnnotationItem.vue'

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

// 更新标注类型
const updateAnnotationType = (annotationId: string, type: AnnotationType) => {
  const annotation = PDFStore.annotations.find((a) => a.id === annotationId)
  if (annotation) {
    annotation.type = type
    // 重新绘制该页面以更新标注颜色
    PDFStore.drawPageAnnotations(annotation.pageNumber)
  }
}

// 关联标注
const linkAnnotations = (parentId: string, childId: string) => {
  const success = PDFStore.linkAnnotations(parentId, childId)
  if (success) {
    ElMessage.success('标注关联成功')
  } else {
    ElMessage.error('标注关联失败，请检查类型是否匹配')
  }
}

// 取消关联标注
const unlinkAnnotations = (parentId: string, childId: string) => {
  const success = PDFStore.unlinkAnnotations(parentId, childId)
  if (success) {
    ElMessage.success('已取消标注关联')
  } else {
    ElMessage.error('取消关联失败')
  }
}

// 构建新的导出结构
const buildQuestionStructure = (groupAnnotations: Annotation[]) => {
  const processedIds = new Set<string>()

  // 按类型分组标注，每个文本标注单独处理其关联的图片
  const annotationsByType = {
    questions: [] as { text: Annotation; images: Annotation[] }[],
    options: [] as { text: Annotation; images: Annotation[] }[],
    answers: [] as { text: Annotation; images: Annotation[] }[],
    others: [] as { text: Annotation; images: Annotation[] }[],
    parses: [] as { text: Annotation; images: Annotation[] }[],
  }

  // 分类所有标注
  groupAnnotations.forEach((annotation) => {
    if (processedIds.has(annotation.id)) return

    const baseType = annotation.type.replace('的图片', '')
    const isImage = annotation.type.includes('图片')

    // 跳过图片标注，它们会通过关联关系被处理
    if (isImage) {
      processedIds.add(annotation.id)
      return
    }

    // 获取该文本标注关联的所有图片
    const childImages = PDFStore.getChildAnnotations(annotation.id)

    const annotationData = {
      text: annotation,
      images: childImages,
    }

    switch (baseType) {
      case '问题':
        annotationsByType.questions.push(annotationData)
        break
      case '选项':
        annotationsByType.options.push(annotationData)
        break
      case '答案':
        annotationsByType.answers.push(annotationData)
        break
      case '其他':
        annotationsByType.others.push(annotationData)
        break
      case '解析':
        annotationsByType.parses.push(annotationData)
        break
    }

    processedIds.add(annotation.id)
    // 标记关联的图片为已处理
    childImages.forEach((child) => processedIds.add(child.id))
  })

  // 构建每个类型的结构
  const buildTypeStructure = (typeData: { text: Annotation; images: Annotation[] }[]) => {
    return typeData.map((item) => ({
      id: item.text.id,
      text: item.text.label,
      images: item.images.length > 0 ? item.images.map(() => '暂未完成') : [],
    }))
  }

  return {
    questions: buildTypeStructure(annotationsByType.questions),
    options: buildTypeStructure(annotationsByType.options),
    answers: buildTypeStructure(annotationsByType.answers),
    others: buildTypeStructure(annotationsByType.others),
    parses: buildTypeStructure(annotationsByType.parses),
  }
}

// 删除标注功能
const deleteAnnotation = async (annotationId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个标注吗？此操作不可撤销。', '删除标注', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    // 找到要删除的标注
    const annotation = PDFStore.annotations.find((a) => a.id === annotationId)
    if (!annotation) {
      ElMessage.error('标注不存在')
      return
    }

    // 从所有组中移除该标注
    PDFStore.annotationGroups.forEach((group) => {
      const index = group.annotationIds.indexOf(annotationId)
      if (index > -1) {
        group.annotationIds.splice(index, 1)
      }
    })

    // 从选中状态中移除
    if (PDFStore.selectedAnnotation === annotationId) {
      PDFStore.selectedAnnotation = null
    }
    PDFStore.selectedAnnotations.delete(annotationId)

    // 从标注列表中删除
    const annotationIndex = PDFStore.annotations.findIndex((a) => a.id === annotationId)
    if (annotationIndex > -1) {
      PDFStore.annotations.splice(annotationIndex, 1)
    }

    // 重新绘制该页面以移除标注显示
    PDFStore.drawPageAnnotations(annotation.pageNumber)

    ElMessage.success('标注已删除')
  } catch (error) {
    // 用户取消删除
    if (error === 'cancel') {
      return
    }
    console.error('删除标注失败:', error)
    ElMessage.error('删除标注失败')
  }
}

// 生成随机组名
const generateRandomGroupName = () => {
  const adjectives = [
    '智慧',
    '精彩',
    '重要',
    '核心',
    '关键',
    '基础',
    '高级',
    '专业',
    '经典',
    '实用',
  ]
  const nouns = ['题目', '问题', '考点', '知识点', '练习', '测试', '案例', '示例', '要点', '内容']
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
  const randomNum = Math.floor(Math.random() * 1000) + 1
  return `${randomAdj}${randomNoun}_${randomNum}`
}

// 获取未分组的标注（避免重复）
const getUngroupedAnnotations = () => {
  const groupedIds = new Set<string>()

  // 收集所有已分组的标注ID
  PDFStore.annotationGroups.forEach((group) => {
    group.annotationIds.forEach((id) => {
      groupedIds.add(id)
      // 同时添加关联的子标注ID
      const childAnnotations = PDFStore.getChildAnnotations(id)
      childAnnotations.forEach((child) => groupedIds.add(child.id))
    })
  })

  // 返回未分组的标注
  return PDFStore.annotations.filter((annotation) => !groupedIds.has(annotation.id))
}

// 导出为题库功能
const exportToQuestionBank = () => {
  try {
    // 获取未分组的标注
    const ungroupedAnnotations = getUngroupedAnnotations()

    // 构建题库数据结构
    const questionBank = {
      title: `PDF标注题库_${new Date().toLocaleDateString()}`,
      totalQuestions: PDFStore.annotationGroups.length,
      totalAnnotations: PDFStore.annotations.length,
      questions: [] as any[],
    }

    // 处理现有分组的标注
    PDFStore.annotationGroups.forEach((group) => {
      const groupAnnotations = getGroupAnnotations(group.id)
      if (groupAnnotations.length === 0) return

      const questionStructure = buildQuestionStructure(groupAnnotations)

      const question = {
        id: group.id,
        groupName: group.name,
        ...questionStructure,
      }

      questionBank.questions.push(question)
    })

    // 如果有未分组的标注，按页面和类型自动创建组
    if (ungroupedAnnotations.length > 0) {
      const annotationsByPage = new Map<number, Annotation[]>()
      ungroupedAnnotations.forEach((annotation) => {
        if (!annotationsByPage.has(annotation.pageNumber)) {
          annotationsByPage.set(annotation.pageNumber, [])
        }
        annotationsByPage.get(annotation.pageNumber)!.push(annotation)
      })

      annotationsByPage.forEach((pageAnnotations, pageNum) => {
        // 按类型分组同一页面的标注
        const typeGroups = new Map<string, Annotation[]>()
        const processedIds = new Set<string>()

        pageAnnotations.forEach((annotation) => {
          if (processedIds.has(annotation.id)) return

          const baseType = annotation.type.replace('的图片', '')
          const isImage = annotation.type.includes('图片')

          // 跳过图片标注，它们会通过关联关系被处理
          if (isImage) {
            processedIds.add(annotation.id)
            return
          }

          if (!typeGroups.has(baseType)) {
            typeGroups.set(baseType, [])
          }

          typeGroups.get(baseType)!.push(annotation)
          processedIds.add(annotation.id)

          // 添加关联的子标注
          const childAnnotations = PDFStore.getChildAnnotations(annotation.id)
          childAnnotations.forEach((child) => {
            typeGroups.get(baseType)!.push(child)
            processedIds.add(child.id)
          })
        })

        // 为每个类型组创建题目
        typeGroups.forEach((annotations, baseType) => {
          if (annotations.length > 0) {
            const questionStructure = buildQuestionStructure(annotations)
            const randomNum = Math.floor(Math.random() * 1000) + 1

            const question = {
              id: `auto_group_${pageNum}_${baseType}_${randomNum}`,
              groupName: `第${pageNum}页_${baseType}_${randomNum}`,
              ...questionStructure,
            }

            questionBank.questions.push(question)
            questionBank.totalQuestions++
          }
        })
      })
    }

    // 生成JSON文件并下载
    const jsonString = JSON.stringify(questionBank, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `PDF标注题库_${PDFStore.PDFFile?.name}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    ElMessage.success(
      `成功导出题库！共${questionBank.totalQuestions}个题目，${questionBank.totalAnnotations}个标注`,
    )
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}
</script>

<style scoped>
.annotation-list-container {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e9ecef;
}

.list-header {
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.action-btn {
  border-radius: 8px !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.group-mode-panel {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.group-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #dee2e6;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: #409eff;
}

.group-header {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-content {
  padding: 12px;
  space-y: 8px;
}

.delete-group-btn {
  border-radius: 6px !important;
  transition: all 0.2s ease !important;
}

.delete-group-btn:hover {
  transform: scale(1.05);
}

.ungrouped-section {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
}

.ungrouped-section:hover {
  border-color: #409eff;
  background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
}

.ungrouped-header {
  border-bottom: 1px dashed #d1d5db;
  padding-bottom: 8px;
  margin-bottom: 12px;
}

.ungrouped-content {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .annotation-list-container {
    padding: 12px;
  }

  .list-header {
    padding-bottom: 12px;
    margin-bottom: 12px;
  }

  .group-card {
    border-radius: 8px;
  }

  .group-header {
    padding: 10px 12px;
  }

  .group-content {
    padding: 10px;
  }
}

/* 保持亮色主题，移除深色模式 */
.annotation-list-container,
.group-card,
.group-header,
.ungrouped-section {
  /* 确保所有元素都使用亮色背景 */
  color: #374151;
}

.group-header {
  border-bottom-color: #e9ecef;
}

.ungrouped-header {
  border-bottom-color: #d1d5db;
}
</style>
