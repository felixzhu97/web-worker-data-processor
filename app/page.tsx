"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, LineChart } from "./components/charts"
import { AlertCircle, FileText, Cpu, Timer, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [processingTime, setProcessingTime] = useState({ withWorker: 0, withoutWorker: 0 })
  const [activeTab, setActiveTab] = useState("with-worker")
  const workerRef = useRef<Worker | null>(null)
  const startTimeRef = useRef<number>(0)
  const [isLongRunning, setIsLongRunning] = useState(false)
  const longRunningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string>("")
  const [processingInfo, setProcessingInfo] = useState<string>("")

  // 组件卸载时清理worker和定时器
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (longRunningTimerRef.current) {
        clearTimeout(longRunningTimerRef.current);
        longRunningTimerRef.current = null;
      }
    };
  }, []);

  const resetProcessingState = () => {
    setIsLongRunning(false);
    setProcessingStatus("");
    setProcessingInfo("");
    setProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResults(null)
      resetProcessingState();
    }
  }

  // 取消正在进行的处理
  const cancelProcessing = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    
    if (longRunningTimerRef.current) {
      clearTimeout(longRunningTimerRef.current);
      longRunningTimerRef.current = null;
    }
    
    setProcessing(false);
    setProgress(0);
    setIsLongRunning(false);
    setProcessingStatus("已取消处理");
  };
  
  // 添加文件大小警告提示
  const getFileSizeWarning = () => {
    if (!file) return null;
    
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 10) {
      return (
        <Alert className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>文件较大</AlertTitle>
          <AlertDescription>
            文件大小为 {fileSizeMB.toFixed(2)} MB，处理可能需要较长时间。
            建议使用 Web Worker 模式以保持界面响应。
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  const processWithWorker = () => {
    if (!file) return

    setProcessing(true)
    setProgress(0)
    setIsLongRunning(false)
    setProcessingStatus("正在处理...")
    
    // 设置长时间运行检测器
    if (longRunningTimerRef.current) {
      clearTimeout(longRunningTimerRef.current);
    }
    
    longRunningTimerRef.current = setTimeout(() => {
      if (processing) {
        setIsLongRunning(true);
        setProcessingStatus("处理较大文件中...");
      }
    }, 5000); // 5秒后显示长时间运行提示
    
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
        
        // 更新处理状态信息
        if (e.data.message) {
          setProcessingStatus(e.data.message);
        } else if (e.data.progress < 20) {
          setProcessingStatus("解析CSV数据...");
        } else if (e.data.progress < 50) {
          setProcessingStatus("处理数据中...");
        } else if (e.data.progress < 80) {
          setProcessingStatus("分析数据中...");
        } else {
          setProcessingStatus("生成结果...");
        }
      } else if (e.data.type === "heartbeat") {
        // 心跳信息，更新状态但不修改进度
        if (e.data.message) {
          setProcessingStatus(e.data.message);
        }
      } else if (e.data.type === "info") {
        // 处理信息消息
        if (e.data.message) {
          setProcessingInfo(e.data.message);
        }
      } else if (e.data.type === "result") {
        // 清除长时间运行定时器
        if (longRunningTimerRef.current) {
          clearTimeout(longRunningTimerRef.current);
          longRunningTimerRef.current = null;
        }
        
        // 计算经过的时间
        const endTime = performance.now()
        const elapsedTime = endTime - startTimeRef.current
        setProcessingTime((prev) => ({ ...prev, withWorker: elapsedTime }))
        setResults(e.data.results)
        setProcessing(false)
        setIsLongRunning(false)
        setProcessingStatus("处理完成")
        
        // 如果有处理摘要，显示处理信息
        if (e.data.results?.summary) {
          const summary = e.data.results.summary;
          setProcessingInfo(
            `已处理 ${summary.processedRows.toLocaleString()}/${summary.totalRows.toLocaleString()} 行数据，找到 ${summary.numericColumns} 个数值列`
          );
        }
      } else if (e.data.type === "error") {
        // 清除长时间运行定时器
        if (longRunningTimerRef.current) {
          clearTimeout(longRunningTimerRef.current);
          longRunningTimerRef.current = null;
        }
        
        console.error("Worker处理错误:", e.data.error);
        setProcessing(false);
        setIsLongRunning(false);
        setProcessingStatus(`处理出错: ${e.data.error}`);
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
    setIsLongRunning(false)
    setProcessingStatus("正在处理...")
    setProcessingInfo("")
    
    // 设置长时间运行检测器
    if (longRunningTimerRef.current) {
      clearTimeout(longRunningTimerRef.current);
    }
    
    longRunningTimerRef.current = setTimeout(() => {
      if (processing) {
        setIsLongRunning(true);
        setProcessingStatus("处理较大文件中...");
      }
    }, 5000); // 5秒后显示长时间运行提示
    
    // 记录开始时间
    const startTime = performance.now()
    
    // 分批处理逻辑
    const processInBatches = (text: string) => {
      // 解析CSV头部
      const lines = text.split("\n");
      const totalLines = lines.length;
      
      // 文件过大警告
      if (totalLines > 10000) {
        setProcessingInfo(`检测到大型数据集(${totalLines.toLocaleString()}行)，将限制处理以避免堆栈溢出`);
      }
      
      // 限制处理行数
      const maxRowsToProcess = Math.min(20000, totalLines);
      
      // 处理CSV头部
      const headers = lines[0].split(",").map(h => h.trim());
      
      // 存储解析后的数据
      const data: Record<string, string | number>[] = [];
      
      // 进度更新频率
      const progressStep = Math.max(1, Math.floor(maxRowsToProcess / 20));
      let currentProgress = 5;
      
      // 设置初始进度
      setProgress(currentProgress);
      setProcessingStatus("解析CSV数据...");
      
      // 分批处理数据
      const batchSize = 1000; // 每批处理1000行
      let currentRow = 1;
      
      // 使用setTimeout来避免堆栈溢出
      const processBatch = () => {
        // 确保不超出总行数
        const endRow = Math.min(currentRow + batchSize, maxRowsToProcess);
        
        // 处理当前批次
        for (let i = currentRow; i < endRow; i++) {
          if (i >= lines.length || lines[i].trim() === "") continue;
          
          try {
            const values = lines[i].split(",");
            const row: Record<string, string | number> = {};
            
            for (let j = 0; j < headers.length && j < values.length; j++) {
              const value = values[j]?.trim() || '';
              const header = headers[j];
              // 高效数值转换
              const num = +value;
              row[header] = isNaN(num) ? value : num;
            }
            
            data.push(row);
          } catch (err) {
            console.error(`处理第${i}行数据时出错:`, err);
          }
          
          // 更新进度
          if (i % progressStep === 0) {
            currentProgress = Math.min(40, 5 + Math.round((i / maxRowsToProcess) * 35));
            setProgress(currentProgress);
          }
        }
        
        // 更新当前行
        currentRow = endRow;
        
        // 如果还有数据未处理，继续下一批
        if (currentRow < maxRowsToProcess && currentRow < lines.length) {
          // 更新状态
          setProcessingStatus(`处理数据中... (${Math.round((currentRow/maxRowsToProcess)*100)}%)`);
          
          // 使用setTimeout避免堆栈溢出并保持UI响应
          setTimeout(processBatch, 0);
        } else {
          // 所有批次处理完成，进行数据分析
          analyzeData(data, headers, totalLines);
        }
      };
      
      // 开始批处理
      setTimeout(processBatch, 0);
    };
    
    // 数据分析函数
    const analyzeData = (data: Record<string, string | number>[], headers: string[], totalLines: number) => {
      try {
        setProgress(50);
        setProcessingStatus("分析数据中...");
        
        // 确定数值列
        const columnTypes: Record<string, number> = {};
        const sampleSize = Math.min(500, data.length);
        
        // 采样检测数值列
        for (let i = 0; i < sampleSize; i++) {
          const row = data[i];
          for (let header of headers) {
            if (typeof row[header] === 'number') {
              columnTypes[header] = (columnTypes[header] || 0) + 1;
            }
          }
        }
        
        // 识别主要是数值的列
        const numericColumns: string[] = [];
        for (let header in columnTypes) {
          if (columnTypes[header] > sampleSize * 0.3) { // 如果30%以上是数值，认为是数值列
            numericColumns.push(header);
          }
        }
        
        setProgress(70);
        setProcessingStatus("计算统计数据...");
        
        // 分析数据 - 高效处理方式
        const stats: Record<string, {min: number, max: number, sum: number, count: number}> = {};
        
        // 初始化统计
        numericColumns.forEach(col => {
          stats[col] = {min: Infinity, max: -Infinity, sum: 0, count: 0};
        });
        
        // 单次遍历计算所有统计值
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          for (let col of numericColumns) {
            const val = row[col];
            if (typeof val === 'number' && !isNaN(val)) {
              if (val < stats[col].min) stats[col].min = val;
              if (val > stats[col].max) stats[col].max = val;
              stats[col].sum += val;
              stats[col].count++;
            }
          }
        }
        
        // 构建分析结果
        const analysis = numericColumns.map(column => {
          const stat = stats[column];
          return {
            column,
            avg: stat.count > 0 ? stat.sum / stat.count : 0,
            min: stat.count > 0 ? stat.min : 0,
            max: stat.count > 0 ? stat.max : 0,
            sum: stat.sum,
            count: stat.count
          };
        });
        
        setProgress(85);
        setProcessingStatus("准备图表数据...");
        
        // 准备图表数据
        const chartData =
          numericColumns.length > 0
            ? {
                labels: data.slice(0, 20).map((_, i) => `Item ${i + 1}`),
                datasets: numericColumns.slice(0, 3).map((column, i) => ({
                  label: column,
                  data: data.slice(0, 20).map(row => typeof row[column] === 'number' ? row[column] as number : 0),
                  backgroundColor: ["rgba(255, 99, 132, 0.5)", "rgba(54, 162, 235, 0.5)", "rgba(255, 206, 86, 0.5)"][
                    i % 3
                  ],
                  borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)"][i % 3],
                })),
              }
            : null;
        
        // 清除长时间运行定时器
        if (longRunningTimerRef.current) {
          clearTimeout(longRunningTimerRef.current);
          longRunningTimerRef.current = null;
        }
        
        // 计算处理时间
        const endTime = performance.now()
        const elapsedTime = endTime - startTime
        
        // 更新处理信息
        setProcessingInfo(
          `已处理 ${data.length.toLocaleString()}/${(totalLines-1).toLocaleString()} 行数据，找到 ${numericColumns.length} 个数值列`
        );
        
        // 更新状态
        setProcessingTime((prev) => ({ ...prev, withoutWorker: elapsedTime }));
        setResults({ 
          analysis, 
          chartData,
          summary: {
            totalRows: totalLines - 1,
            processedRows: data.length,
            numericColumns: numericColumns.length
          }
        });
        
        setProgress(100);
        setProcessing(false);
        setIsLongRunning(false);
        setProcessingStatus("处理完成");
      } catch (error) {
        console.error("数据分析错误:", error);
        setProcessingStatus(`处理出错: ${error instanceof Error ? error.message : "未知错误"}`);
        setProcessing(false);
        setIsLongRunning(false);
        
        // 清除长时间运行定时器
        if (longRunningTimerRef.current) {
          clearTimeout(longRunningTimerRef.current);
          longRunningTimerRef.current = null;
        }
      }
    };
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        if (e.target?.result) {
          const text = e.target.result as string;
          processInBatches(text);
        }
      } catch (error) {
        console.error("文件读取错误:", error);
        setProcessingStatus(`文件读取错误: ${error instanceof Error ? error.message : "未知错误"}`);
        setProcessing(false);
        
        // 清除长时间运行定时器
        if (longRunningTimerRef.current) {
          clearTimeout(longRunningTimerRef.current);
          longRunningTimerRef.current = null;
        }
      }
    }
    
    reader.onerror = () => {
      setProcessingStatus("文件读取失败");
      setProcessing(false);
      
      // 清除长时间运行定时器
      if (longRunningTimerRef.current) {
        clearTimeout(longRunningTimerRef.current);
        longRunningTimerRef.current = null;
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
              {getFileSizeWarning()}
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
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">{processingStatus}</p>
                  {isLongRunning && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={cancelProcessing}
                            className="ml-2"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            取消
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>取消当前处理操作</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                <Progress value={progress} className="w-full" />
                <p className="text-center text-sm text-muted-foreground">{progress}% 完成</p>
                
                {processingInfo && (
                  <p className="text-sm text-blue-500">{processingInfo}</p>
                )}
                
                {isLongRunning && (
                  <Alert>
                    <Timer className="h-4 w-4" />
                    <AlertTitle>处理时间较长</AlertTitle>
                    <AlertDescription>
                      正在处理大量数据，可能需要更长时间。界面仍可正常操作。
                      {activeTab !== "with-worker" && (
                        <div className="mt-2">
                          提示：下次尝试使用 Web Worker 模式可能会有更好的体验。
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
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
                
                {processingInfo && (
                  <p className="text-sm text-blue-500 mt-2">{processingInfo}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <p>Upload and process data to see results</p>
                {processingStatus && (
                  <p className="mt-2 text-sm text-yellow-500">{processingStatus}</p>
                )}
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
