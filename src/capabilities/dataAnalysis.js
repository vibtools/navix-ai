function numericValues(values) {
  return values.map((value) => typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))).filter(Number.isFinite);
}

export function analyzeRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { rowCount: 0, columnCount: 0, columns: [] };
  const headers = rows[0].map((value, index) => String(value || `Column ${index + 1}`));
  const records = rows.slice(1);
  return {
    rowCount: records.length,
    columnCount: headers.length,
    columns: headers.map((name, index) => {
      const values = records.map((row) => row[index]);
      const present = values.filter((value) => value !== '' && value !== null && value !== undefined);
      const numbers = numericValues(present);
      return {
        name,
        missing: values.length - present.length,
        unique: new Set(present.map(String)).size,
        type: present.length > 0 && numbers.length === present.length ? 'number' : 'text',
        ...(numbers.length === present.length && numbers.length ? {
          min: Math.min(...numbers), max: Math.max(...numbers),
          mean: numbers.reduce((sum, value) => sum + value, 0) / numbers.length
        } : {})
      };
    })
  };
}

export function formatAnalysis(analysis) {
  const lines = [`Rows: ${analysis.rowCount}`, `Columns: ${analysis.columnCount}`];
  for (const column of analysis.columns) {
    const metrics = [`type=${column.type}`, `missing=${column.missing}`, `unique=${column.unique}`];
    if (column.type === 'number') metrics.push(`min=${column.min}`, `max=${column.max}`, `mean=${Number(column.mean.toFixed(4))}`);
    lines.push(`- ${column.name}: ${metrics.join(', ')}`);
  }
  return lines.join('\n');
}
