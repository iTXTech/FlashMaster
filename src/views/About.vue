<template>
    <v-container grid-list-xl fluid>
        <v-layout row wrap>
            <v-flex lg4 sm12 xs12>
                <v-card>
                    <v-card-title>{{$t('nav.about')}}</v-card-title>
                    <v-card-text>
                        <p v-html="$t('about')"/>
                    </v-card-text>
                </v-card>
            </v-flex>

            <v-flex lg3 sm12 xs12>
                <v-card>
                    <v-card-title>{{$t('support.alipay')}}</v-card-title>
                    <v-card-text>
                        <v-img :src="require('@/assets/alipay.jpg')"/>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn color="primary" href="https://qr.alipay.com/FKX04751EZDP0SQ0BOT137" target="_blank" text>
                            {{$t('support.alipayUrl')}}
                        </v-btn>
                        <v-btn color="primary" text :href="require('@/assets/alipay.jpg')" download="alipay.jpg">
                            {{$t('support.saveQrCode')}}
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-flex>
        </v-layout>
    </v-container>
</template>
