import React, { useEffect, useState } from 'react'

import { FIELD_LABELS } from '@shared/constants'
import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'

import type { Bookmark } from '@shared/schemas/bookmark'

interface BookmarkDetailProps {
  bookmark: Bookmark
  onUpdate: (title: string, url: string) => void
  onDelete: () => void
  onOpen: () => void
  onClose: () => void
}

export const BookmarkDetail: React.FC<BookmarkDetailProps> = ({
  bookmark,
  onUpdate,
  onDelete,
  onOpen,
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

  return (
    <div
      className="bg-white p-2 w-full"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }}
    >
      <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch">
        {/* 左側: テキストボックスを2段で配置 */}
        <div className="grid grid-rows-2 gap-4">
          <InputField
            id="detail-title"
            label={FIELD_LABELS.TITLE}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Bookmark Title"
          />
          <InputField
            id="detail-url"
            label={FIELD_LABELS.URL}
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="https://..."
            className="font-mono"
          />
        </div>

        {/* 右側: 4つのボタンを4段で配置 */}
        <div className="grid grid-rows-4 gap-0.5 min-w-20">
          <Button variant="primary" onClick={handleUpdate}>
            {FIELD_LABELS.BUTTON_UPDATE}
          </Button>
          <Button variant="secondary" onClick={onOpen}>
            {FIELD_LABELS.BUTTON_OPEN}
          </Button>
          <Button variant="danger" onClick={onDelete}>
            {FIELD_LABELS.BUTTON_DELETE}
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            title={FIELD_LABELS.BUTTON_CLOSE}
          >
            {FIELD_LABELS.BUTTON_CLOSE}
          </Button>
        </div>
      </div>
    </div>
  )
}
