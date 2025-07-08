// app/items/[id]/edit/page.tsx
'use client'

import { useParams } from 'next/navigation'
import EditItemPage from './EditItemPage'

export default function EditItemPageWrapper() {
  const params = useParams()
  const itemId = params.id as string

  return <EditItemPage itemId={itemId} />
}