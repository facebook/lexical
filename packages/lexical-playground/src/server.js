import generateLinkPreview from 'link-preview-generator';

export const handler = (req, res, next) => {
  if (req.path === '/api/link-preview') {
    return generateLinkPreview(req.query.url)
      .then((preview) => res.end(JSON.stringify({preview})))
      .catch(() => res.end(JSON.stringify({preview: null})));
  }
  next();
};
