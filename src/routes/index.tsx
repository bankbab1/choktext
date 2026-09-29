import { createFileRoute } from '@tanstack/react-router'
import { ExtractorApp } from '@/features/extractor/ExtractorApp'

export const Route = createFileRoute('/')({
  component: ExtractorApp,
})
