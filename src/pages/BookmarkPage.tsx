import { FIELD_LABELS, PLACEHOLDERS, UI_MESSAGES } from '@shared/constants'
import { Button } from '@shared/ui/Button'
import { InputField } from '@shared/ui/InputField'
import { useBookmarkPage } from '../hooks/useBookmarkPage'
import { KeywordList } from '../components/KeywordList'

interface BookmarkPageProps {
  onBack?: () => void
}

export function BookmarkPage({ onBack }: BookmarkPageProps) {
  const {
    id,
    bookmark,
    unassignedKeywords,
    isLoading,
    editTitle,
    setEditTitle,
    editUrl,
    setEditUrl,
    keywordInput,
    setKeywordInput,
    isUpdating,
    isDeleting,
    isAddingKeyword,
    handleUpdate,
    handleDelete,
    handleOpen,
    handleBack,
    handleAddKeyword,
  } = useBookmarkPage(onBack)

  if (isLoading) {
    return <div className="p-4">Loading...</div>
  }

  if (!bookmark) {
    return (
      <div className="p-4">
        <p className="text-red-600 mb-4">Bookmark not found (ID: {id})</p>
        <Button variant="secondary" onClick={handleBack}>
          {FIELD_LABELS.BUTTON_CLOSE}
        </Button>
      </div>
    )
  }

  const handleDeleteWithConfirm = () => {
    if (window.confirm(UI_MESSAGES.DELETE_CONFIRM)) {
      handleDelete()
    }
  }

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      {/* 1. 基本情報ブロック */}
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
        <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch">
          <div className="grid grid-rows-2 gap-4">
            <InputField
              id="detail-title"
              label={FIELD_LABELS.TITLE}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder={PLACEHOLDERS.TITLE}
            />
            <InputField
              id="detail-url"
              label={FIELD_LABELS.URL}
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder={PLACEHOLDERS.URL}
              className="font-mono"
            />
          </div>

          <div className="grid grid-rows-4 gap-0.5 min-w-24">
            <Button
              variant="primary"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? '...' : FIELD_LABELS.BUTTON_UPDATE}
            </Button>
            <Button variant="secondary" onClick={handleOpen}>
              {FIELD_LABELS.BUTTON_OPEN}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteWithConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? '...' : FIELD_LABELS.BUTTON_DELETE}
            </Button>
            <Button variant="secondary" onClick={handleBack}>
              {FIELD_LABELS.BUTTON_CLOSE}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. キーワード追加ブロック */}
      <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg shadow-sm">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <InputField
              id="keyword-input"
              label={FIELD_LABELS.ADD_KEYWORD_LABEL}
              width="w-28"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              placeholder={PLACEHOLDERS.KEYWORD}
            />
          </div>
          <div className="pb-1">
            <Button
              onClick={handleAddKeyword}
              disabled={!keywordInput.trim() || isAddingKeyword}
              variant="secondary"
            >
              {isAddingKeyword ? '...' : FIELD_LABELS.BUTTON_ADD}
            </Button>
          </div>
        </div>
      </div>

      {/* 3. 割当済みキーワードブロック */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 ml-1">
          {FIELD_LABELS.ASSIGNED_KEYWORDS_LABEL}
        </h3>
        <KeywordList
          keywords={bookmark.keywords}
          onKeywordClick={() => {}}
          onReorder={() => {}}
        />
      </div>

      {/* 4. 未割当キーワードブロック */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 ml-1">
          {FIELD_LABELS.UNASSIGNED_KEYWORDS_LABEL}
        </h3>
        <KeywordList
          keywords={unassignedKeywords}
          onKeywordClick={() => {}}
          onReorder={() => {}}
        />
      </div>
    </div>
  )
}
