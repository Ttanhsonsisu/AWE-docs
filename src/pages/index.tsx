import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const quickLinks = [
  {
    title: 'Use AWE',
    description: 'Create workflows, configure nodes, publish definitions, and monitor executions.',
    to: '/docs/awe/user-guide',
  },
  {
    title: 'Built-in Plugins',
    description: 'Reference Manual, Webhook, Cron, Log, Delay, Approval, If, Join, and RetryTest.',
    to: '/docs/awe/builtin-plugins',
  },
  {
    title: 'Build Plugins',
    description: 'Implement Dynamic DLL plugins with AWE.Sdk.v2, schema metadata, and version upload.',
    to: '/docs/awe/custom-plugin-sdk',
  },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title="AWE Documentation"
      description="Documentation for Automation Workflow Engine">
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>Automation Workflow Engine</div>
              <Heading as="h1" className={styles.title}>
                AWE Documentation
              </Heading>
              <p className={styles.subtitle}>
                Tai lieu su dung workflow engine, built-in plugins, plugin
                management API va cach phat trien plugin bang AWE.Sdk.
              </p>
              <div className={styles.actions}>
                <Link className={styles.primaryAction} to="/docs/awe/overview">
                  Read docs
                </Link>
                <Link className={styles.secondaryAction} to="/docs/awe/custom-plugin-sdk">
                  Build a plugin
                </Link>
              </div>
            </div>

            <div className={styles.surface} aria-label="AWE workflow preview">
              <div className={styles.surfaceTop}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.workflow}>
                <div className={styles.node}>
                  <span className={styles.nodeType}>Trigger</span>
                  <strong>CronTrigger</strong>
                </div>
                <div className={styles.connector} />
                <div className={styles.node}>
                  <span className={styles.nodeType}>Logic</span>
                  <strong>If</strong>
                </div>
                <div className={styles.branchGrid}>
                  <div className={styles.branchLine} />
                  <div className={styles.node}>
                    <span className={styles.nodeType}>Core</span>
                    <strong>Log</strong>
                  </div>
                  <div className={styles.node}>
                    <span className={styles.nodeType}>Human</span>
                    <strong>Approval</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.links}>
          {quickLinks.map((link) => (
            <Link className={styles.card} to={link.to} key={link.title}>
              <span>{link.title}</span>
              <p>{link.description}</p>
            </Link>
          ))}
        </section>
      </main>
    </Layout>
  );
}
