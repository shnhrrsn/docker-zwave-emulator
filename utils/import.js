const xml2js = require('xml2js')
const fs = require('fs')
const nopt = require('nopt')
const path = require('path')

const { src: srcs, dst } = nopt(
	{
		src: [path, Array],
		dst: path,
	},
	undefined,
	process.argv,
	2,
)

if (!srcs || srcs.length === 0 || !dst) {
	console.error('Invalid args')
	process.exit(1)
}

async function run() {
	const builder = new xml2js.Builder({
		xmldec: {
			encoding: 'utf-8',
		},
		renderOpts: {
			pretty: true,
			indent: '\t',
		},
	})

	const json = {
		virtualcom: {
			start: 'auto',
			modul: 'socat',
			ports: {
				zwavectrl: '/tmp/ttyS0',
				emulator: '/tmp/ttyS1',
			},
		},
		controller: {
			zwversion: 'Z-Wave 2.78',
			serialapiversion: [3, 7],
			rfchipversion: [3, 1],
			fakeneighbors: {},
		},
		nodes: [],
	}

	let xml = null
	const nodeIds = []

	for (const [index, src] of Object.entries(srcs)) {
		const ozw = await xml2js.parseStringPromise(fs.readFileSync(src))
		ozw.Driver.$.home_id = '0x01ff11ff'

		if (Number(index) > 0) {
			// We only want the first controller node
			ozw.Driver.Node = ozw.Driver.Node.filter(node => node.$.id !== ozw.Driver.$.node_id)
		}

		for (const node of ozw.Driver.Node) {
			const nodeId = Number(index) * 100 + Number(node.$.id)
			node.$.id = nodeId.toString()
			nodeIds.push(nodeId)

			const willSleep =
				node.CommandClasses[0].CommandClass.filter(
					({ $ }) => $.name === 'COMMAND_CLASS_WAKE_UP',
				).length > 0

			json.nodes.push({
				nodeid: Number(node.$.id),
				comment: `${node.Manufacturer[0].$.name} ${node.Manufacturer[0].Product[0].$.name}`,
				failed: false,
				timeoutwakeup: willSleep ? 120 : 0,
				wakeupduration: willSleep ? 10 : 0,
				pollingvalues: [],
				cmdclssextraparams: {},
			})

			delete node.Neighbors
		}

		if (xml) {
			xml.Driver.Node.push(...ozw.Driver.Node)
		} else {
			xml = JSON.parse(JSON.stringify(ozw))
		}
	}

	// Generate fake neighbors
	nodeIds.forEach((nodeId, index) => {
		json.controller.fakeneighbors[nodeId] = new Set(nodeIds.slice(index, index + 3))
	})

	for (const nodeId of nodeIds) {
		for (const neighbor of json.controller.fakeneighbors[nodeId]) {
			json.controller.fakeneighbors[neighbor].add(nodeId)
		}
	}

	for (const nodeId of nodeIds) {
		json.controller.fakeneighbors[nodeId].delete(nodeId)
		json.controller.fakeneighbors[nodeId] = Array.from(json.controller.fakeneighbors[nodeId])
	}

	// Write files
	fs.writeFileSync(path.join(dst, 'zwcfg_0x01ff11ff.json'), JSON.stringify(json, null, '\t'))
	fs.writeFileSync(path.join(dst, 'zwcfg_0x01ff11ff.xml'), builder.buildObject(xml))
}

run()
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
	.then(() => {
		process.exit(0)
	})
