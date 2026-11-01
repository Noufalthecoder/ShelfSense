const APIS = [
  ['AI Skin Analysis', 'Maps concerns like spots, oiliness, redness and pores from one selfie.'],
  ['Skin Tone Analysis', 'Finds your tone and undertone for shade-true matches.'],
  ['Makeup Virtual Try-On', 'Renders the exact lipstick or foundation shade on your face.'],
];

export default function Platform() {
  return (
    <div className="platform">
      <section className="section fade">
        <p className="platform-title">Built on YouCam APIs</p>
        {APIS.map(([name, body]) => (
          <div key={name}><h4>{name}</h4><p>{body}</p></div>
        ))}
      </section>
    </div>
  );
}
