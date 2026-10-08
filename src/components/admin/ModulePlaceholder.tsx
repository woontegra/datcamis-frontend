export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <>
      <div className="admin-top"><h1>{title}</h1></div>
      <section className="panel-admin">
        <p style={{ margin: 0 }}>Bu modülün veri modeli hazır. Yönetim ekranı henüz uygulanmadı; örnek işlem veya sahte kayıt yok.</p>
      </section>
    </>
  );
}
