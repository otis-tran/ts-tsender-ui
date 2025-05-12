import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Home() {
  return (
     <main style={{ padding: '2rem' }}> {/* Added some padding for layout */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <ConnectButton /> {/* Add the button here */}
      </div>
      <h1> Hi Otis</h1>
    </main>
  );
}
