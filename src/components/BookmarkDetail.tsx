import React, { useEffect, useState } from 'react'

import { UI_MESSAGES } from '@shared/constants'
import { Button } from './ui/Button'
import { InputField } from './ui/InputField'

import type { Bookmark } from '@shared/schemas/bookmark'

interface BookmarkDetailProps {
  bookmark: Bookmark
  onUpdate: (title: string, url: string) => void
  onDelete: () => void
  onClose: () => void
}

export const BookmarkDetail: React.FC<BookmarkDetailProps> = ({
  bookmark,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const [editTitle, setEditTitle] = useState(bookmark.title)
  const [editUrl, setEditUrl] = useState(bookmark.url)

  // 選択されたブックマークが変わった時に、入力内容をリセット
  useEffect(() => {
    setEditTitle(bookmark.title)
    setEditUrl(bookmark.url)
  }, [bookmark])

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(editTitle, editUrl)
  }

  const handleDelete = () => {
    if (window.confirm(UI_MESSAGES.DELETE_CONFIRM)) {
      onDelete()
    }
  }

  const handleOpen = () => {
    window.open(bookmark.url, '_blank', 'noreferrer')
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-t-xl shadow-2xl p-6 pointer-events-auto">
        <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch">
          {/* 左側: テキストボックスを2段で配置 */}
          <div className="grid grid-rows-2 gap-4">
            <InputField
              id="detail-title"
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Bookmark Title"
            />
            <InputField
              id="detail-url"
              label="URL"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://..."
              className="font-mono"
            />
          </div>

          {/* 右側: 4つのボタンを4段で配置 */}
          <div className="grid grid-rows-4 gap-0.5 min-w-20">
            <Button variant="primary" onClick={handleUpdate}>
              {UI_MESSAGES.BUTTON_UPDATE}
            </Button>
            <Button variant="secondary" onClick={handleOpen}>
              {UI_MESSAGES.BUTTON_OPEN}
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              {UI_MESSAGES.BUTTON_DELETE}
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              title={UI_MESSAGES.BUTTON_CLOSE}
            >
              {UI_MESSAGES.BUTTON_CLOSE}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
