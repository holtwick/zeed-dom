/* eslint-disable no-console */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { parseHTML } from '../src/vdomparser.ts'

interface BenchResult {
  fileName: string
  fileSize: number
  parseTime: number
  success: boolean
  error?: string
  charsParsed: number
}

function benchmarkFile(filePath: string, fileName: string): BenchResult {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const start = performance.now()

    const dom = parseHTML(content)

    const end = performance.now()
    const parseTime = end - start

    return {
      fileName,
      fileSize: content.length,
      parseTime,
      success: true,
      charsParsed: content.length,
    }
  }
  catch (error) {
    return {
      fileName,
      fileSize: 0,
      parseTime: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      charsParsed: 0,
    }
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes}B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatTime(ms: number): string {
  if (ms < 1)
    return `${(ms * 1000).toFixed(0)}μs`
  if (ms < 1000)
    return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

async function main() {
  const filesDir = join(process.cwd(), 'files')
  const htmlFiles = readdirSync(filesDir).filter(f => f.endsWith('.html'))

  console.log(`🚀 Benchmarking HTML Parser on ${htmlFiles.length} files...\n`)

  const results: BenchResult[] = []
  let totalBytes = 0
  let totalTime = 0
  let successCount = 0
  let errorCount = 0

  for (const fileName of htmlFiles) {
    const filePath = join(filesDir, fileName)
    const result = benchmarkFile(filePath, fileName)
    results.push(result)

    if (result.success) {
      totalBytes += result.fileSize
      totalTime += result.parseTime
      successCount++

      // Show progress for successful parses
      const throughput = result.fileSize / (result.parseTime / 1000) / (1024 * 1024) // MB/s
      console.log(`✅ ${fileName.slice(0, 20)}... ${formatSize(result.fileSize)} in ${formatTime(result.parseTime)} (${throughput.toFixed(1)} MB/s)`)
    }
    else {
      errorCount++
      console.log(`❌ ${fileName.slice(0, 20)}... ERROR: ${result.error}`)
    }
  }

  // Summary statistics
  console.log(`\n📊 BENCHMARK SUMMARY`)
  console.log(`===================`)
  console.log(`Total files: ${htmlFiles.length}`)
  console.log(`Successful: ${successCount} (${((successCount / htmlFiles.length) * 100).toFixed(1)}%)`)
  console.log(`Failed: ${errorCount} (${((errorCount / htmlFiles.length) * 100).toFixed(1)}%)`)
  console.log(`Total data: ${formatSize(totalBytes)}`)
  console.log(`Total time: ${formatTime(totalTime)}`)

  if (successCount > 0) {
    const avgThroughput = totalBytes / (totalTime / 1000) / (1024 * 1024) // MB/s
    console.log(`Average throughput: ${avgThroughput.toFixed(1)} MB/s`)
    console.log(`Average file size: ${formatSize(totalBytes / successCount)}`)
    console.log(`Average parse time: ${formatTime(totalTime / successCount)}`)
  }

  // Show detailed error information if any
  if (errorCount > 0) {
    console.log(`\n❌ ERRORS DETAILS`)
    console.log(`================`)
    const errorFiles = results.filter(r => !r.success)
    for (const result of errorFiles) {
      console.log(`${result.fileName}: ${result.error}`)
    }
  }

  // Top performers and slowest files
  const successfulResults = results.filter(r => r.success).sort((a, b) => b.parseTime - a.parseTime)

  if (successfulResults.length > 0) {
    console.log(`\n⚡ PERFORMANCE BREAKDOWN`)
    console.log(`=======================`)

    // Slowest files
    console.log(`\nSlowest files:`)
    successfulResults.slice(0, 5).forEach((result, i) => {
      const throughput = result.fileSize / (result.parseTime / 1000) / (1024 * 1024)
      console.log(`${i + 1}. ${result.fileName.slice(0, 30)}... ${formatTime(result.parseTime)} (${formatSize(result.fileSize)}, ${throughput.toFixed(1)} MB/s)`)
    })

    // Fastest files
    console.log(`\nFastest files:`)
    successfulResults.slice(-5).reverse().forEach((result, i) => {
      const throughput = result.fileSize / (result.parseTime / 1000) / (1024 * 1024)
      console.log(`${i + 1}. ${result.fileName.slice(0, 30)}... ${formatTime(result.parseTime)} (${formatSize(result.fileSize)}, ${throughput.toFixed(1)} MB/s)`)
    })
  }
}

main().catch(console.error)
