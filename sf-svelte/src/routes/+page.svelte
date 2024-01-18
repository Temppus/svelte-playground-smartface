<script lang="ts">
	import { onMount } from 'svelte';
	import { Indicator } from 'flowbite-svelte';
	import { Heading, Span } from 'flowbite-svelte';
	import { Card } from 'flowbite-svelte';
	import { Range, Helper, Label } from 'flowbite-svelte';
	import { CardPlaceholder } from 'flowbite-svelte';
	import CameraNotificationCard from '../components/CameraNotificationCard.svelte';

	// Websocket stuff
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
			const pedestrianData = JSON.parse(event.data).data.pedestrianInserted;

			//console.log('[websocket] message received', notificationData);

			const cameraId = pedestrianData.streamId;
			const pedestriansOnCameraCount = pedestrianData.objectsOnFrameCountForType;
			const frameId = pedestrianData.frameId;

			const camera = cameras.find((camera) => camera.id === cameraId);

			// Update camera in grid
			if (camera) {
				camera.currentObjectsCount = pedestriansOnCameraCount;
				cameras = cameras;
			}

			let cameraCounts = camerasCountMap.get(cameraId);

			// Update metadata map
			if (cameraCounts) {
				cameraCounts.push(pedestriansOnCameraCount);
			} else {
				camerasCountMap.set(cameraId, [pedestriansOnCameraCount]);
			}

			// Update notification card
			const notificationCameraCard = notificationCards.find((card) => card.cameraId === cameraId);

			if (notificationCameraCard) {
				const currentDate = new Date();
				const lastUpdateDate = notificationCameraCard.lastUpdate;

				const timeDifferenceInSeconds = Math.floor(
					(currentDate.getTime() - lastUpdateDate.getTime()) / 1000
				);

				console.log('timedifff');
				console.log(timeDifferenceInSeconds);

				// update either time from previous one passed 5 seconds
				if (timeDifferenceInSeconds > 5) {
					console.log('UPDATING LAST UPDATE');
					notificationCameraCard.lastUpdate = currentDate;
					notificationCards = notificationCards;
				}

				// update only if count is above threshold
				if (pedestriansOnCameraCount >= pedestriansCountThreshold) {
					notificationCameraCard.currentPedestriansCount = pedestriansOnCameraCount;
					notificationCameraCard.frameId = frameId;
				}

				// UPDATE UI only if greater than peviously (solves too many UI updates after each notification)
				if (pedestriansOnCameraCount > pedestriansCountThreshold) {
					notificationCards = notificationCards;
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
								counts: [BigInt(pedestriansOnCameraCount)],
								frameId: frameId,
								lastUpdate: new Date()
							} as NotificationCard
						];
					}
				} else {
					console.log(
						`Counts not yet reached. Min consecutiveCount is set to ${consecutiveCount} currentCount is ${cameraCounts.length}`
					);
				}

				notificationCards = notificationCards;
			}
		});
	};

	// Helper types for notifications
	type CameraInfo = {
		currentObjectsCount: bigint;
		id: string;
		name: string;
		enabled: boolean;
	};

	let cameras: CameraInfo[] = [];

	type NotificationCard = {
		cameraId: string;
		frameId: string;
		cameraName: string;
		currentPedestriansCount: bigint;
		lastUpdate: Date;
	};

	// Collection of notification cards 
	let notificationCards: NotificationCard[] = [];	
	let camerasCountMap = new Map<string, number[]>();

	onMount(async () => {
		// fetch data from API on page mount
		const res = await fetch(`http://smartface-demo:8098/api/v1/Cameras`);
		const jsonCameras = await res.json();

		// update DOM with data
		cameras = jsonCameras.map((camera: any) => ({
			currentObjectsCount: 0,
			id: camera.id,
			name: camera.name,
			enabled: camera.enabled
		}));

		// enabled cameras should be on top
		cameras.sort((a, b) => (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1));

		establishWebSocket();
	});

	let pedestriansCountThreshold = 1;
	let consecutiveCount = 1;

	// Reset all collections to clear UI
	$: pedestriansCountThreshold && reset();
	$: consecutiveCount && reset();

	// Reset all collections to clear UI 
	const reset = () => {
		notificationCards = [];
		camerasCountMap.clear();
	};
</script>

<div>
	<div class="ml-8 mt-8">
		<div class="grid grid-cols-2 gap-4">
			<!-- Upper panel with configuraion range sliders -->
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
				<Helper class="text-lg mt-2"
					>Number of consecutive pedestrians above threshold to trigger notification</Helper
				>
			</div>

			<!-- Notififation card row grid -->
			<div class="flex space-x-2">
				{#if notificationCards.length == 0}
					<CardPlaceholder class="bg-cyan-600" />
				{:else}
					{#each notificationCards as notificationCard}
						{#key notificationCard.lastUpdate}
							<CameraNotificationCard
								frameId={notificationCard.frameId}
								cameraName={notificationCard.cameraName}
								currentPedestriansCount={notificationCard.currentPedestriansCount}
							></CameraNotificationCard>
						{/key}
					{/each}
				{/if}
			</div>
		</div>

		<!-- Cameras grid -->
		<div class="grid grid-cols-6 gap-0 mt-2">
			{#each cameras as camera}
				<div class="mt-2">
					<Card reverse={false}>
						<h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
							<span class="flex items-center">
								<Indicator size="sm" color={camera.enabled ? 'green' : 'red'} class="mr-1.5" />
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
</div>
