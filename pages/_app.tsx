import type {AppProps} from 'next/app';
import Head from 'next/head';
import {useEffect} from "react";
import {ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {Link} from "../components/link";
import '../styles/globals.css';
import css from "./_app.module.css";

export default function MyApp({Component, pageProps}: AppProps) {
  useEffect(() => {
    updateScrollWidth();
    window.addEventListener('resize', updateScrollWidth);
    return () => window.removeEventListener('resize', updateScrollWidth);
  }, []);

  return <>
    <Head>
      <title>Texel Editor</title>
      <meta name="viewport" content="initial-scale=1.0, width=device-width"/>
      <meta property="og:site_name" content="Texel editor"/>
    </Head>
    <div className={css.main}>
      <Component {...pageProps} />
    </div>
    <footer className={css.footer}>
      <div className="centered">
        <p>
          Texel editor open source project.
          {' '}<Link href="https://github.com/Nemo64/texel">Source code available on GitHub.</Link>
          {' '}Feel free to file issues and contribute to make this tool fit your use case better.
        </p>
        <p>
          THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
          IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
          BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
          TORT
          OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
          DEALINGS IN THE SOFTWARE.
        </p>
      </div>
    </footer>
    <ToastContainer/>
  </>;
}

function updateScrollWidth() {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);

}
