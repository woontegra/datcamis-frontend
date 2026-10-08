export function Rows({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) return <p style={{ margin: 0 }}>Kayıt yok.</p>;
  return (
    <>
      <div className="table-scroll only-desktop">
        <table>
          <thead>
            <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="only-mobile">
        {rows.map((row, index) => (
          <article className="admin-card" key={index}>
            {row.map((cell, cellIndex) => (
              <p key={cellIndex} style={{ margin: 0 }}><strong>{headers[cellIndex]}: </strong>{cell}</p>
            ))}
          </article>
        ))}
      </div>
    </>
  );
}
