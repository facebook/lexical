import Head from 'next/head';

import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Lexical</title>
        <meta
          name="description"
          content="Lexical is an extensible text editor library that provides excellent reliability, accessible and performance."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.logo}
            src="/logo.svg"
            alt="Lexical Logo: containing an icon of a text editor glyph containing a text cursor on the left, with the text of 'Lexical' on the right."
          />
        </h1>

        <p className={styles.description}>
          An extensible text editor library that does things differently.
        </p>
        <p>Coming early 2022</p>
      </main>

      <footer className={styles.footer}>Copyright © 2021 Meta Inc.</footer>
    </div>
  );
}
