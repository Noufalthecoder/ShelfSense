const ROWS = [
  ['Drop-in widget', 'Add the ShelfSense lens to any product page or in-store QR code with one script tag.'],
  ['Shade-true try-on', 'Shoppers see the exact shade on their own face before they buy.'],
  ['Put-back insights', 'Learn, anonymously, why shoppers skip a product: the ingredient, the shade or the skin concern.'],
];

export default function Retail() {
  return (
    <section className="section retail" id="retail">
      <div className="section-head fade">
        <p className="eyebrow">For retailers</p>
        <h2>Fewer wrong buys. <em>Fewer returns.</em></h2>
        <p>Shoppers who know a product suits them buy with confidence, and keep what they buy.</p>
      </div>
      <ol className="rows fade">
        {ROWS.map(([title, body], i) => (
          <li key={title}><span className="n">0{i + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>
        ))}
      </ol>
    </section>
  );
}
