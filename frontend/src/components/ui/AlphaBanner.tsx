import { AlertTriangle } from 'lucide-react'

export const AlphaBanner = () => {
  return (
    <div className="w-full bg-blue-50 border-b border-blue-100">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-blue-600" />
          <p className="text-sm text-blue-600">
            <span className="font-bold">Beta Release:</span> We're continuously improving. Your feedback is valuable!
          </p>
        </div>
      </div>
    </div>
  )
}
