"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, LineChart } from "./components/charts"
import { AlertCircle, FileText, Cpu } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [processingTime, setProcessingTime] = useState({ withWorker: 0, withoutWorker: 0 })
  const [activeTab, setActiveTab] = useState("with-worker")
  const workerRef = useRef<Worker | null>(null)
  const startTimeRef = useRef<number>(0)

  // 组件卸载时清理worker
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResults(null)
      setProgress(0)
    }
  }

  const processWithWorker = () => {
    if (!file) return

    setProcessing(true)
    setProgress(0)
    
    // 每次处理前重置Worker
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    
    // 创建新的Worker实例
    workerRef.current = new Worker(new URL("./workers/data-worker.js", import.meta.url))
    
    // 记录开始时间 
    startTimeRef.current = performance.now()
    
    // 设置监听器
    workerRef.current.onmessage = (e) => {
      if (e.data.type === "progress") {
        setProgress(e.data.progress)
      } else if (e.data.type === "result") {
        // 计算经过的时间
        const endTime = performance.now()
        const elapsedTime = endTime - startTimeRef.current
        setProcessingTime((prev) => ({ ...prev, withWorker: elapsedTime }))
        setResults(e.data.results)
        setProcessing(false)
      } else if (e.data.type === "error") {
        console.error("Worker处理错误:", e.data.error);
        setProcessing(false);
      }
    }

    // 发送文件到worker
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result && workerRef.current) {
        workerRef.current.postMessage({
          type: "process",
          data: e.target.result,
        })
      }
    }
    reader.readAsText(file)
  }

  const processWithoutWorker = () => {
    if (!file) return

    setProcessing(true)
    setProgress(0)
    
    // 记录开始时间
    const startTime = performance.now()
    
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        // 模拟进度更新
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          setProgress(progress)
          if (progress >= 100) {
            clearInterval(interval)
          }
        }, 50) // 加快进度更新速度

        // 处理数据
        const text = e.target.result as string
        const lines = text.split("\n")
        const headers = lines[0].split(",")

        const data: Record<string, string | number>[] = []
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === "") continue

          const values = lines[i].split(",")
          const row: Record<string, string | number> = {}

          for (let j = 0; j < headers.length; j++) {
            const value = values[j]?.trim()
            row[headers[j].trim()] = isNaN(Number(value)) ? value : Number(value)
          }

          data.push(row)
        }

        // 分析数据
        const numericColumns = headers.filter((header) => {
          return data.some((row) => typeof row[header.trim()] === "number")
        })

        const analysis = numericColumns.map((column) => {
          const values = data.map((row) => row[column.trim()] as number).filter((val) => !isNaN(val))
          const sum = values.reduce((acc, val) => acc + val, 0)
          const avg = sum / values.length
          const min = Math.min(...values)
          const max = Math.max(...values)

          return {
            column,
            avg,
            min,
            max,
            sum,
            count: values.length,
          }
        })

        // 准备图表数据
        const chartData =
          numericColumns.length > 0
            ? {
                labels: data.slice(0, 20).map((_, i) => `Item ${i + 1}`),
                datasets: numericColumns.slice(0, 3).map((column, i) => ({
                  label: column,
                  data: data.slice(0, 20).map((row) => row[column] as number),
                  backgroundColor: ["rgba(255, 99, 132, 0.5)", "rgba(54, 162, 235, 0.5)", "rgba(255, 206, 86, 0.5)"][
                    i % 3
                  ],
                  borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)"][i % 3],
                })),
              }
            : null

        // 计算处理时间
        const endTime = performance.now()
        const elapsedTime = endTime - startTime
        setProcessingTime((prev) => ({ ...prev, withoutWorker: elapsedTime }))
        setResults({ analysis, chartData })
        
        // 清除进度定时器
        clearInterval(interval)
        setProgress(100)
        setProcessing(false)
      }
    }
    reader.readAsText(file)
  }

  const handleProcess = () => {
    if (activeTab === "with-worker") {
      processWithWorker()
    } else {
      processWithoutWorker()
    }
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Web Worker Data Processor</h1>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload Data</CardTitle>
            <CardDescription>Upload a CSV file to process</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg">
              <FileText className="h-10 w-10 text-muted-foreground mb-4" />
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="file-upload" />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Select CSV File
              </label>
              {file && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Choose Processing Method</CardTitle>
            <CardDescription>Compare with and without Web Workers</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="with-worker" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="with-worker">With Web Worker</TabsTrigger>
                <TabsTrigger value="without-worker">Without Web Worker</TabsTrigger>
              </TabsList>
              <div className="mt-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Processing Method</AlertTitle>
                  <AlertDescription>
                    {activeTab === "with-worker"
                      ? "Using Web Workers to process data in a separate thread, keeping the UI responsive."
                      : "Processing data in the main thread, which may freeze the UI during heavy processing."}
                  </AlertDescription>
                </Alert>
              </div>
            </Tabs>
          </CardContent>
          <CardFooter>
            <Button onClick={handleProcess} disabled={!file || processing} className="w-full">
              {processing ? "Processing..." : "Process Data"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3: View Results</CardTitle>
            <CardDescription>Analysis and visualization</CardDescription>
          </CardHeader>
          <CardContent>
            {processing ? (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground">Processing data...</p>
                <Progress value={progress} className="w-full" />
                <p className="text-center text-sm text-muted-foreground">{progress}% complete</p>
              </div>
            ) : results ? (
              <div className="space-y-2">
                <p className="font-medium">Processing Time:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    <span>With Worker:</span>
                  </div>
                  <span className="font-mono">{processingTime.withWorker.toFixed(2)} ms</span>

                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    <span>Without Worker:</span>
                  </div>
                  <span className="font-mono">{processingTime.withoutWorker.toFixed(2)} ms</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <p>Upload and process data to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {results && (
        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Data Analysis</CardTitle>
              <CardDescription>Statistical summary of numeric columns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Column</th>
                      <th className="text-left py-2">Average</th>
                      <th className="text-left py-2">Min</th>
                      <th className="text-left py-2">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.analysis.map((item: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">{item.column}</td>
                        <td className="py-2">{item.avg.toFixed(2)}</td>
                        <td className="py-2">{item.min}</td>
                        <td className="py-2">{item.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Visualization</CardTitle>
              <CardDescription>Chart representation of the first 20 rows</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="bar">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bar">Bar Chart</TabsTrigger>
                  <TabsTrigger value="line">Line Chart</TabsTrigger>
                </TabsList>
                <TabsContent value="bar" className="pt-4">
                  {results.chartData ? (
                    <BarChart data={results.chartData} />
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      No numeric data available for visualization
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="line" className="pt-4">
                  {results.chartData ? (
                    <LineChart data={results.chartData} />
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      No numeric data available for visualization
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
