/**
 * Utility to export data to CSV
 */
export const exportToCSV = (data, filename, headers) => {
    if (!data || !data.length) return;

    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const val = row[header] ?? '';
                // Handle objects/arrays and escape quotes
                const formattedVal = typeof val === 'object' 
                    ? JSON.stringify(val).replace(/"/g, '""') 
                    : String(val).replace(/"/g, '""');
                return `"${formattedVal}"`;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
