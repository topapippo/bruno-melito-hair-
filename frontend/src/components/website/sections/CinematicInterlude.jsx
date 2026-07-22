export default function CinematicInterlude({ image, quote }) {
  return (
    <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${image})` }}
      ></div>
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="relative z-10 text-center px-6 max-w-3xl">
        <h2 className="text-3xl md:text-5xl font-black text-white italic" style={{ fontFamily: "'Playfair Display', serif", lineHeight: 1.2 }}>
          "{quote || "La bellezza è un'arte, noi siamo i tuoi artisti."}"
        </h2>
      </div>
    </section>
  );
}
