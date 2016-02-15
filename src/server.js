import 'babel-polyfill';
import Express from 'express';
import React from 'react';
import favicon from 'serve-favicon';
import compression from 'compression';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import path from 'path';
import { renderToString } from 'react-dom/server';
import {
  match,
  RouterContext
} from 'react-router';

import log from './logger';
import routesNotHot from './containers/routes';

const app = new Express();
const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 8000;
let routes = routesNotHot;

// configure logging
if (__DEV__) {
  app.use(morgan('dev', {
    stream: log.stream
  }));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400,
    stream: log.stream
  }));
}
app.use(compression());
app.use(favicon(path.join(__dirname, '..', 'static', 'favicon.ico')));
app.use(Express.static(path.join(__dirname, '..', 'static')));
app.use(bodyParser.urlencoded({ extended: false }));

app.use((req, res) => {
  match({ routes, location: req.originalUrl }, (error, redirectLocation, renderProps) => {
    if (redirectLocation) {
      res.redirect(redirectLocation.pathname + redirectLocation.search, '/');
    } else if (error) {
      console.error('ROUTER ERROR:', error);
      res.status(500);
      // hydrateOnClient(); // TODO what does that mean?
    } else if (renderProps) {
      const reactString = renderToString(<RouterContext {...renderProps} />);
      const body = (
        `<!doctype html>
        <html lang="en-us">
        <head>
        <meta charset="utf-8">
        <title>react-isomorphic-starterkit</title>
        <link rel="shortcut icon" href="/favicon.ico">
        </head>
        <body>
        <div id="react-root">${reactString}</div>
        </body>
        </html>`
      );
      res.status(200).send(body);
    } else {
      res.status(404).send('Not found');
    }
  });
});

app.listen(port, () => {
  log.info('==> ✅  Server is listening');
  log.info(`==> 🌎  Go to http://${hostname}:${port}`);
});

if (__DEV__ && module.hot) {
  log.info('[HMR] Waiting for server-side updates');

  module.hot.accept('./containers/routes', () => {
    routes = require('./containers/routes');
  });

  module.hot.addStatusHandler((status) => {
    if (status === 'abort') {
      setTimeout(() => process.exit(0), 0);
    }
  });
}
