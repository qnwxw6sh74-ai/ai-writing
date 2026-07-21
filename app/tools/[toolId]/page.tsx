import { getToolById, getAllTools } from '@/lib/tools/registry'
import { FileUploader } from '@/components/tools/FileUploader'

interface ToolPageProps {
  params: Promise<{ toolId: string }>
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { toolId } = await params
  const tool = getToolById(toolId)

  if (!tool) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">工具不存在</h1>
          <a href="/tools" className="text-red-400 hover:text-red-300">返回首页</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl mb-4 block">{tool.icon}</span>
          <h1 className="text-3xl font-bold text-white mb-2">{tool.name}</h1>
          <p className="text-zinc-400">{tool.description}</p>
        </div>

        {/* Upload Section */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
          <FileUploader
            toolId={tool.id}
            accepts={tool.accepts}
            onUploadComplete={(files) => console.log('Uploaded:', files)}
          />
        </div>

        {/* Params Section */}
        {tool.paramsSchema && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">参数设置</h2>
            <div className="space-y-4">
              {Object.entries(tool.paramsSchema).map(([key, schema]) => (
                <div key={key}>
                  <label className="block text-sm text-zinc-400 mb-1">
                    {schema.label || key}
                  </label>
                  {schema.type === 'select' ? (
                    <select
                      defaultValue={String(schema.default)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200"
                    >
                      {(schema.options as string[]).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={schema.type}
                      defaultValue={schema.default}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Process Button */}
        <button className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
          开始处理
        </button>
      </div>
    </div>
  )
}
