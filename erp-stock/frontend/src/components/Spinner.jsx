export default function Spinner({ text = 'Chargement...' }) {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}
