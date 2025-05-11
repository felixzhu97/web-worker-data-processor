// Web Worker for data processing
self.onmessage = (e) => {
  if (e.data.type === "process") {
    const text = e.data.data
    processData(text)
  }
}

function processData(text) {
  // Parse CSV
  const lines = text.split("\n")
  const headers = lines[0].split(",")

  const totalLines = lines.length
  const data = []

  // Process data in chunks to report progress
  const chunkSize = Math.max(1, Math.floor(totalLines / 10))

  for (let i = 1; i < totalLines; i++) {
    if (lines[i].trim() === "") continue

    const values = lines[i].split(",")
    const row = {}

    for (let j = 0; j < headers.length; j++) {
      const value = values[j]?.trim()
      row[headers[j].trim()] = isNaN(Number(value)) ? value : Number(value)
    }

    data.push(row)

    // Report progress every chunk
    if (i % chunkSize === 0 || i === totalLines - 1) {
      const progress = Math.min(100, Math.round((i / totalLines) * 100))
      self.postMessage({ type: "progress", progress })
    }
  }

  // Analyze data
  const numericColumns = headers.filter((header) => {
    return data.some((row) => typeof row[header.trim()] === "number")
  })

  const analysis = numericColumns.map((column) => {
    const values = data.map((row) => row[column.trim()]).filter((val) => !isNaN(val))
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

  // Prepare chart data
  const chartData =
    numericColumns.length > 0
      ? {
          labels: data.slice(0, 20).map((_, i) => `Item ${i + 1}`),
          datasets: numericColumns.slice(0, 3).map((column, i) => ({
            label: column,
            data: data.slice(0, 20).map((row) => row[column]),
            backgroundColor: ["rgba(255, 99, 132, 0.5)", "rgba(54, 162, 235, 0.5)", "rgba(255, 206, 86, 0.5)"][i % 3],
            borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)"][i % 3],
          })),
        }
      : null

  // Send results back to main thread
  self.postMessage({
    type: "result",
    results: { analysis, chartData },
  })
}
