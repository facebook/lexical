import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Outline</title>
        <meta name="description" content="Outline is an extensible text editor engine that provides excellent reliability, accessible and performance." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          <img className={styles.logo} src="/logo.svg" alt="Outline Logo: containing an icon of a text editor glyph containing a text cursor on the left, with the text of 'Ouline' on the right." />
        </h1>

        <p className={styles.description}>
          Watch this space&hellip;
        </p>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Copyright © 2021 Meta Inc.
        </a>
      </footer>
    </div>
  )
}
