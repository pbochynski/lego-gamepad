const open = require('open');

const express = require('express')
const app = express()
const port = 3000
let color = 1;
let pads = [];
let timestamp = 0;
app.use(express.json());
app.get('/hello', (req, res) => {
  res.send('Hello World!')
})
app.post('/api', (req, res) => {
  pads = req.body;
  detectButton();
  res.send({ message: "ok" });
})
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

/*
 *
 * This demonstrates connecting multiple hubs to your laptop. Once connected, all the hubs LED lights will cycle through the same colors simultaneously.
 *
 */

const PoweredUP = require("node-poweredup");

const poweredUP = new PoweredUP.PoweredUP();

const ctrl = [
  { color: PoweredUP.Consts.Color.GREEN, pad: 0, id: 0 },
  { color: PoweredUP.Consts.Color.RED, pad: 1, id: 0 },
  { color: PoweredUP.Consts.Color.BLUE, pad: 2, id: 0 },
  { color: PoweredUP.Consts.Color.YELLOW, pad: 3, id: 0 }
];

function detectButton() {
  for (let i = 0; i < pads.length; ++i) {
    for (let j = 0; j < pads[i].buttons.length; ++j) {
      if (pads[i].buttons[j].pressed) {
        console.log(`Pad ${i} button ${j} pressed`);
        if (j < 4) {
          ctrl[j].pad = i;
          return;
        }
        if (j == 9) {
          ctrl.forEach((h) => { if (h.pad == i) h.pad = -1 });
        }
      }
    }
  }
}

poweredUP.scan(); // Start scanning for hubs

console.log("Looking for Hubs...");

poweredUP.on("discover", async (hub) => { // Wait to discover hubs
  await hub.connect(); // Connect to hub
  console.log(`Connected to ${hub.name}!`);
  console.log(`Name: ${hub.name}, uuid: ${hub.uuid}`);
  for (let i = 0; i < ctrl.length; ++i) {
    if (ctrl[i].id == 0) {
      ctrl[i].id = hub.uuid;
      console.log(`Hub ${hub.name}(${hub.uuid}) connected to button ${i}`);
      const led = await hub.waitForDeviceByType(PoweredUP.Consts.DeviceType.HUB_LED)
      led.setColor(ctrl[i].color);
      break;
    }
  }

  hub.on("disconnect", () => {
    for (let i = 0; i < ctrl.length; ++i) {
      if (ctrl[i].id == hub.uuid) {
        ctrl[i].id = 0;
        console.log(`Hub ${hub.name}(${hub.uuid}) disconnected from button ${i}`);
      }
    }

    console.log("Hub disconnected");
  })
  hub.on("colorAndDistance", (device, { color, distance }) => {
    console.log(`Color and distance detected on port ${device.portName} (Color: ${color}, Distance: ${distance})`);
  });
});

setInterval(() => {
  if (!pads[0]) {
    return;
  }

  if (timestamp >= pads[0]) {
    return;
  }
  timestamp = pads[0].timestamp;
  const hubs = poweredUP.getHubs(); // Get an array of all connected hubs
  hubs.forEach(async (hub) => {
    const devices = await hub.getDevices()
    console.log(ctrl)
    const c = ctrl.find((c) => { return c.id == hub.uuid })
    if (!c) {
      console.log(`Hub ${hub.uuid} not registered`)
      return;
    }
    console.log(`Controller:`, c);
    const pad = c.pad;
    if (pad == -1) {
      console.log(`Hub ${hub.uuid} not assigned to any pad`)
      return;
    }
    for (let d of devices) {
      if (d.type == PoweredUP.Consts.DeviceType.DUPLO_TRAIN_BASE_MOTOR) {
        power = pads[pad].axes[1] * -1.0  
        if (power < 0.3 && power > -0.3) {
          power = 0;

        }
        await d.setPower(power * 100);
      }
      if (d.type == PoweredUP.Consts.DeviceType.MOVE_HUB_MEDIUM_LINEAR_MOTOR && d.portId < 2) {
        let power = [0, 0]

        power = pads[pad].axes[1] * -1.0 + pads[pad].axes[2] * (d.portId ? -1.0 : 1.0);

        if (power < 0.3 && power > -0.3) {
          power = 0;

        }
        await d.setPower(power * 100);

      }
    }
  })

}, 100);

open(`http://localhost:${port}`);