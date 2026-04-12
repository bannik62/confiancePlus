// validate(schema)          → valide req.body
// validate(schema, 'params') → valide req.params
// validate(schema, 'query')  → valide req.query

export const validate = (schema, target = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[target])
  if (!result.success)
    return res.status(422).json({ errors: result.error.flatten().fieldErrors })
  req[target] = result.data   // données nettoyées + defaults appliqués
  next()
}
