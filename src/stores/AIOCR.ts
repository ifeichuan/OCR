// Kimi API 配置
const KIMI_CONFIG = {
  apiKey: 'sk-ANw6D4oW324S6K8fa7Dnucxu8gpT6ubeNXCNNEMY4DPd4eKo',
  apiPoint: 'https://api.moonshot.cn',
  model: 'moonshot-v1-128k-vision-preview',
}

export async function callOCR(base64Image: string) {
  try {
    const response = await fetch(`${KIMI_CONFIG.apiPoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KIMI_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: KIMI_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请识别图片中的所有文字内容，直接返回识别到的文字，不需要其他说明。不要识别下划线 加粗等格式 只识别纯文本',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Kimi API调用失败: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return (
      (data.choices?.[0]?.message?.content as string).split('```')[1].trim() || '未识别到文字内容'
    )
  } catch (error) {
    console.error('Kimi OCR调用失败:', error)
    throw new Error(`OCR识别失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}
