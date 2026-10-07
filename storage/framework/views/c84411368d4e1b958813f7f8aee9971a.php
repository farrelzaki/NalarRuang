<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <?php echo app('Illuminate\Foundation\Vite')->reactRefresh(); ?>
        <?php echo app('Illuminate\Foundation\Vite')('resources/js/app.tsx'); ?>
        <?php if (isset($component)) { $__componentOriginal56673881198e3a2924721e242dee6899 = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal56673881198e3a2924721e242dee6899 = $attributes; } ?>
<?php $component = Inertia\View\Components\Head::resolve([] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('inertia::head'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Inertia\View\Components\Head::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes([]); ?>
            <title>NalarRuang</title>
         <?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginal56673881198e3a2924721e242dee6899)): ?>
<?php $attributes = $__attributesOriginal56673881198e3a2924721e242dee6899; ?>
<?php unset($__attributesOriginal56673881198e3a2924721e242dee6899); ?>
<?php endif; ?>
<?php if (isset($__componentOriginal56673881198e3a2924721e242dee6899)): ?>
<?php $component = $__componentOriginal56673881198e3a2924721e242dee6899; ?>
<?php unset($__componentOriginal56673881198e3a2924721e242dee6899); ?>
<?php endif; ?>
    </head>
    <body>
        <?php if (isset($component)) { $__componentOriginal1830bdc8f8b965a5838ec47487b5507c = $component; } ?>
<?php if (isset($attributes)) { $__attributesOriginal1830bdc8f8b965a5838ec47487b5507c = $attributes; } ?>
<?php $component = Inertia\View\Components\App::resolve([] + (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag ? $attributes->all() : [])); ?>
<?php $component->withName('inertia::app'); ?>
<?php if ($component->shouldRender()): ?>
<?php $__env->startComponent($component->resolveView(), $component->data()); ?>
<?php if (isset($attributes) && $attributes instanceof Illuminate\View\ComponentAttributeBag): ?>
<?php $attributes = $attributes->except(\Inertia\View\Components\App::ignoredParameterNames()); ?>
<?php endif; ?>
<?php $component->withAttributes([]); ?>
<?php echo $__env->renderComponent(); ?>
<?php endif; ?>
<?php if (isset($__attributesOriginal1830bdc8f8b965a5838ec47487b5507c)): ?>
<?php $attributes = $__attributesOriginal1830bdc8f8b965a5838ec47487b5507c; ?>
<?php unset($__attributesOriginal1830bdc8f8b965a5838ec47487b5507c); ?>
<?php endif; ?>
<?php if (isset($__componentOriginal1830bdc8f8b965a5838ec47487b5507c)): ?>
<?php $component = $__componentOriginal1830bdc8f8b965a5838ec47487b5507c; ?>
<?php unset($__componentOriginal1830bdc8f8b965a5838ec47487b5507c); ?>
<?php endif; ?>
    </body>
</html>
<?php /**PATH C:\laragon\www\NalarRuang\resources\views/app.blade.php ENDPATH**/ ?>