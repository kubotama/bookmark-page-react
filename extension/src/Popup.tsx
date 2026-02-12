import { UI_MESSAGES } from '@shared/constants'

export const Popup = () => {
  return (
    <div className="p-4 w-64">
      <h1 className="text-lg font-bold">{UI_MESSAGES.EXTENSION_TITLE}</h1>
      <p>{UI_MESSAGES.EXTENSION_CONTENT}</p>
    </div>
  )
}
