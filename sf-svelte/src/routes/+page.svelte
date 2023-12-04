<script lang="ts">
	import { onMount } from 'svelte';

	import { Indicator } from 'flowbite-svelte';
	import { Heading, Span } from 'flowbite-svelte';
	import { Card } from 'flowbite-svelte';	

	let cameras: {
		name: string;
		enabled: boolean;
	}[] = [];

	onMount(async () => {
		const res = await fetch(`http://smartface-demo:8098/api/v1/Cameras`);
		const jsonCameras = await res.json();

		cameras = jsonCameras.map((camera: { name: string; enabled: boolean }) => camera);
		cameras.sort((a, b) => (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1));
	});

	function getRandomInt(max: number) {
		return Math.floor(Math.random() * max);
	}

	let vCard = false;
</script>

<div>
	Notifications
	<div class="grid grid-cols-1 gap-4">
		<Card img="/images/camera_frame.jfif" class="ml-4 mt-4">
			<h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">AAA</h5>
			<!-- <Button>
			  Read more <ArrowRightOutline class="w-3.5 h-3.5 ml-2 text-white" />
			</Button> -->

			<Heading tag="h1" class="mb-4" customSize="text-4xl font-extrabold  md:text-5xl lg:text-6xl"
				>5</Heading
			>
		</Card>
	</div>
</div>

<div class="grid grid-cols-4 gap-1">
	<!-- <div>{($getAllCameras.data?.cameras?.items?.[0]?.id) || 'No camera found'}</div>
    <pre>{JSON.stringify($getAllCameras.data, null, 2)}</pre> -->

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
						>{@html getRandomInt(5)}</Heading
					>
				</p></Card
			>
		</div>
	{/each}
</div>
