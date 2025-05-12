// Web Worker for data processing
self.onmessage = (e) => {
  if (e.data.type === "process") {
    const text = e.data.data
    processData(text)
  }
}

function processData(text) {
  try {
    // 初始进度消息
    self.postMessage({ type: "progress", progress: 5 });
    
    // 解析CSV
    const lines = text.split("\n");
    const headers = lines[0].split(",").map(h => h.trim());
    const totalLines = lines.length;
    
    // 预分配数组空间
    const data = new Array(Math.min(20000, totalLines)); // 限制处理的最大行数以提高性能
    let validRows = 0;
    
    // 进度更新
    self.postMessage({ type: "progress", progress: 15 });
    
    // 限制处理的行数
    const maxRows = Math.min(20000, totalLines);
    const updateFrequency = Math.max(1, Math.floor(maxRows / 10));
    
    // 第一阶段：解析数据
    for (let i = 1; i < maxRows; i++) {
      if (i >= lines.length || lines[i].trim() === "") continue;
      
      const values = lines[i].split(",");
      const row = {};
      
      // 只处理有效列
      for (let j = 0; j < headers.length && j < values.length; j++) {
        const value = values[j]?.trim();
        if (value !== undefined && value !== "") {
          const header = headers[j];
          // 高效转换数字
          const num = +value;
          row[header] = isNaN(num) ? value : num;
        }
      }
      
      data[validRows++] = row;
      
      // 减少进度更新次数
      if (i % updateFrequency === 0) {
        const progress = Math.min(40, 15 + Math.round((i / maxRows) * 25));
        self.postMessage({ type: "progress", progress });
      }
    }
    
    // 修正数组大小
    data.length = validRows;
    
    self.postMessage({ type: "progress", progress: 45 });
    
    // 统计和分析
    // 只检查前500行判断列类型
    const sampleSize = Math.min(500, data.length);
    const numericColumns = [];
    const isNumeric = {};
    
    // 快速检测数值列
    for (let i = 0; i < Math.min(sampleSize, data.length); i++) {
      const row = data[i];
      for (let header of headers) {
        if (typeof row[header] === 'number') {
          isNumeric[header] = (isNumeric[header] || 0) + 1;
        }
      }
    }
    
    // 确定主要是数值的列
    for (let header in isNumeric) {
      if (isNumeric[header] > sampleSize * 0.3) { // 如果30%的样本行是数字，就认为是数值列
        numericColumns.push(header);
      }
    }
    
    self.postMessage({ type: "progress", progress: 60 });
    
    // 同时计算所有统计量，避免多次循环
    const stats = {};
    numericColumns.forEach(column => {
      stats[column] = { 
        min: Infinity, 
        max: -Infinity, 
        sum: 0, 
        count: 0 
      };
    });
    
    // 单次循环计算所有列的统计值
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      for (let column of numericColumns) {
        const val = row[column];
        if (typeof val === 'number' && !isNaN(val)) {
          const stat = stats[column];
          if (val < stat.min) stat.min = val;
          if (val > stat.max) stat.max = val;
          stat.sum += val;
          stat.count++;
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
    
    self.postMessage({ type: "progress", progress: 80 });
    
    // 准备图表数据 - 只取前20行
    const chartSampleSize = Math.min(20, data.length);
    const chartLabels = Array.from({ length: chartSampleSize }, (_, i) => `Item ${i + 1}`);
    
    // 只为图表准备最多3个数值列
    const chartColumns = numericColumns.slice(0, 3);
    const chartDatasets = chartColumns.map((column, i) => {
      const colors = [
        ["rgba(255, 99, 132, 0.5)", "rgba(255, 99, 132, 1)"],
        ["rgba(54, 162, 235, 0.5)", "rgba(54, 162, 235, 1)"],
        ["rgba(255, 206, 86, 0.5)", "rgba(255, 206, 86, 1)"]
      ];
      
      return {
        label: column,
        data: data.slice(0, chartSampleSize).map(row => 
          typeof row[column] === 'number' ? row[column] : 0),
        backgroundColor: colors[i % 3][0],
        borderColor: colors[i % 3][1]
      };
    });
    
    const chartData = chartColumns.length > 0 
      ? { labels: chartLabels, datasets: chartDatasets } 
      : null;
    
    self.postMessage({ type: "progress", progress: 95 });
    
    // 发送结果
    self.postMessage({
      type: "result",
      results: { analysis, chartData }
    });
    
  } catch (error) {
    // 错误处理
    console.error("Worker处理错误:", error);
    self.postMessage({
      type: "error",
      error: error.message || "未知错误"
    });
  }
}
