<script lang="ts">
	let webSocketEstablished = false;
	let ws: WebSocket | null = null;

	const establishWebSocket = () => {
		if (webSocketEstablished) return;
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		ws = new WebSocket(`${protocol}//${window.location.host}/websocket`);
		ws.addEventListener('open', (event) => {
			webSocketEstablished = true;
			console.log('[websocket] connection open', event);
		});
		ws.addEventListener('close', (event) => {
			console.log('[websocket] connection closed', event);
		});
		ws.addEventListener('message', (event) => {
			const notificationData = JSON.parse(event.data);

			//console.log('[websocket] message received', notificationData);

			const cameraId = notificationData.data.pedestrianProcessed.frameInformation.streamId;
			const pedestriansOnCameraCount =
				notificationData.data.pedestrianProcessed.pedestrianInformation.pedestriansOnFrameCount;

			const camera = cameras.find((camera) => camera.id === cameraId);

			if (camera) {
				//console.log('camera update');
				camera.currentObjectsCount = pedestriansOnCameraCount;

				// trigger sveltkit array reactivity for arrays
				cameras = cameras;
			}
		});
	};

	import { onMount } from 'svelte';
	import { Indicator } from 'flowbite-svelte';
	import { Heading, Span } from 'flowbite-svelte';
	import { Card } from 'flowbite-svelte';

	type CameraInfo = {
		currentObjectsCount: bigint;
		id: string;
		name: string;
		enabled: boolean;
	};

	let cameras: CameraInfo[] = [];

	onMount(async () => {
		const res = await fetch(`http://smartface-demo:8098/api/v1/Cameras`);
		const jsonCameras = await res.json();

		cameras = jsonCameras.map((camera: any) => ({
			currentObjectsCount: 0,
			id: camera.id,
			name: camera.name,
			enabled: camera.enabled
		}));

		cameras.sort((a, b) => (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1));

		establishWebSocket();
	});

	let vCard = false;
</script>

<div>
	Notifications
	<div class="grid grid-cols-1 gap-4">
		<Card img="/images/camera_frame.jfif" class="ml-4 mt-4">
			<h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">AAA</h5>
			<Heading tag="h1" class="mb-4" customSize="text-4xl font-extrabold  md:text-5xl lg:text-6xl">
				5
			</Heading>
		</Card>
	</div>
</div>

<div class="grid grid-cols-4 gap-1">
	{#each cameras as camera}
		<div>
			<Card reverse={vCard} class="ml-4 mt-4">
				<h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
					<span class="flex items-center">
						{#if camera.enabled}
							<Indicator size="sm" color="green" class="mr-1.5" />
						{:else}
							<Indicator size="sm" color="red" class="mr-1.5" />
						{/if}
						<Span highlight>{camera.name}</Span>
					</span>
				</h5>
				<p class="mb-3 font-normal text-gray-700 dark:text-gray-400 leading-tight">
					Pedestrians on scene
					<Heading
						tag="h1"
						class="mb-4"
						customSize="text-4xl font-extrabold  md:text-5xl lg:text-6xl"
						>{camera.currentObjectsCount}</Heading
					>
				</p></Card
			>
		</div>
	{/each}
</div>
