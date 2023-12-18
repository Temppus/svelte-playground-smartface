<script lang="ts">
	type CameraInfo = {
		currentObjectsCount: bigint;
		id: string;
		name: string;
		enabled: boolean;
	};

	let cameras: CameraInfo[] = [];

	type NotificationCard = {
		cameraId: string;
		cameraName: string;
		currentPedestriansCount: bigint;
	};

	let notificationCards: NotificationCard[] = [];
	let camerasCountMap = new Map<string, number[]>();

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
			const notificationData = JSON.parse(event.data).data;

			//console.log('[websocket] message received', notificationData);

			const cameraId = notificationData.pedestrianProcessed.frameInformation.streamId;
			const pedestriansOnCameraCount =
				notificationData.pedestrianProcessed.pedestrianInformation.pedestriansOnFrameCount;

			const camera = cameras.find((camera) => camera.id === cameraId);

			// Update camera in grid
			if (camera) {
				camera.currentObjectsCount = pedestriansOnCameraCount;
				cameras = cameras;
			}

			let cameraCounts = camerasCountMap.get(cameraId);

			if (cameraCounts) {				
				cameraCounts.push(pedestriansOnCameraCount);
			} else {				
				camerasCountMap.set(cameraId, [pedestriansOnCameraCount]);
			}

			const notificationCameraCard = notificationCards.find((card) => card.cameraId === cameraId);

			if (notificationCameraCard) {
				// update only if count is above threshold
				if (pedestriansOnCameraCount >= pedestriansCountThreshold) {
					notificationCameraCard.currentPedestriansCount = pedestriansOnCameraCount;
				}
			} else {

				// should never happen
				if (!cameraCounts) {
					return;
				}

				if (cameraCounts.length >= consecutiveCount) {
					const lastThreeItems = cameraCounts.slice(-consecutiveCount);
					const allLastConsecutiveCountsAboveThreshold = lastThreeItems.every(
						(item) => item >= pedestriansCountThreshold
					);

					if (allLastConsecutiveCountsAboveThreshold) {
						notificationCards = [
							...notificationCards,
							{
								cameraId: cameraId,
								cameraName: camera?.name,
								currentPedestriansCount: pedestriansOnCameraCount,
								counts: [BigInt(pedestriansOnCameraCount)]
							} as NotificationCard
						];
					}
				}
				else {
					console.log(`not enough counts ${consecutiveCount} currentCount is ${cameraCounts.length}`);
				}
			}

			notificationCards = notificationCards;
		});
	};

	import { onMount } from 'svelte';
	import { Indicator } from 'flowbite-svelte';
	import { Heading, Span } from 'flowbite-svelte';
	import { Card } from 'flowbite-svelte';
	import { Range, Helper, Label } from 'flowbite-svelte';
	import { slide } from 'svelte/transition';

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

	let pedestriansCountThreshold = 1;
	let consecutiveCount = 1;

	$: pedestriansCountThreshold && reset();
	$: consecutiveCount && reset();

	const reset = () => {
		notificationCards = [];
	    camerasCountMap.clear();

		notificationCards = notificationCards;
    }

</script>

<div class="ml-8 mt-8">
	<div class="grid grid-cols-2 gap-4">
		<div>
			<Label class="block mb-2 text-lg">Pedestrian in scene threshold</Label>
			<Label class="text-lg">{pedestriansCountThreshold}</Label>
			<Range id="range-steps" min="0" max="10" bind:value={pedestriansCountThreshold} step="1" />
			<Helper class="text-lg mt-2">
				Minimal number of pedestrians in scene to trigger notification
			</Helper>
		</div>
		<div>
			<Label class="block mb-2 text-lg">Consecutive count</Label>
			<Label class="text-lg">{consecutiveCount}</Label>
			<Range id="range-steps" min="0" max="30" bind:value={consecutiveCount} step="1" />
			<Helper class="text-lg mt-2">Number of consecutive pedestrians above threshold to trigger notification</Helper>
		</div>

		<div class="grid grid-flow-col">
			{#each notificationCards as notificationCard}
				<div transition:slide={{ delay: 0, duration: 600, axis: 'x' }}>
					<Card img="/images/camera_frame.jfif" class="bg-teal-500">
						<h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
							{notificationCard.cameraName}
						</h5>
						<Heading
							tag="h1"
							class="mb-4"
							customSize="text-4xl font-extrabold  md:text-5xl lg:text-6xl"
						>
							{notificationCard.currentPedestriansCount}
						</Heading>
					</Card>
				</div>
			{/each}
		</div>
	</div>

	<div class="grid grid-cols-6 gap-0 mt-2">
		{#each cameras as camera}
			<div class="mt-2">
				<Card reverse={false}>
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
</div>
