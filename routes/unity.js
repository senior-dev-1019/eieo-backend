var express = require('express');
var router = express.Router();

var unityLog = require('../models/unitylog')

router.post('/log', async (req, res) => {

  try {
    await unityLog.create(req.body)
    console.log('success')
    res.json({ success: true })
  } catch (e) {
    console.log(e.message)
    console.log('failure')
    res.json({ success: false })
  }
});
router.get('/logs', async (req, res) => {
  try {
    var logs = await unityLog.find({}, '_id time')
    res.json({ success: true, logs: logs })
  } catch (e) {
    console.log(e.message)
    res.json({ success: false })
  }
})
router.get('/log/:id', async (req, res) => {
  try {
    var id = req.params.id
    var log = await unityLog.findById(id)
    res.json({ success: true, log: log })
  } catch (e) {
    console.log(e.message)
  }
})

module.exports = router;