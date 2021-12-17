import Head from 'next/head'
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
          { /* eslint-disable-next-line @next/next/no-img-element */ }
          <img className={styles.logo} src="/logo.svg" alt="Outline Logo: containing an icon of a text editor glyph containing a text cursor on the left, with the text of 'Ouline' on the right." />
        </h1>

        <p className={styles.description}>
          An extensible text editor engine that does things differently.
        </p>
        <p>
          Coming early 2022
        </p>
      </main>

      <footer className={styles.footer}>
        Copyright © 2021 Meta Inc.
      </footer>
    </div>
  )
}
