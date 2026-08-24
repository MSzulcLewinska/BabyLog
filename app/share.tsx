import { BackHeader } from '@/components/back-header';
import { PrimaryButton } from '@/components/primary-button';
import { Palette } from '@/constants/theme';
import { useLiveData } from '@/hooks/use-live-data';
import { loadChild } from '@/lib/storage';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

export default function ShareScreen() {
  const child = useLiveData(loadChild);

  const shareCode = async () => {
    if (!child) return;

    await Share.share({
      message: `Kod do BabyLog: ${child.shareCode}`,
    });
  };

  const copyCode = () => {
    if (!child) return;
    Alert.alert('Kod dziecka', child.shareCode);
  };

  return (
    <View style={styles.screen}>
      <BackHeader title="Udostępnij dziecko" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>👨‍👩‍👧</Text>
        </View>
        <Text style={styles.lead}>
          Udostępnij kod, żeby druga osoba mogła dołączyć do dziennika.
        </Text>

        <Pressable style={styles.codeBox} onPress={copyCode}>
          <Text style={styles.code}>{child?.shareCode ?? '—'}</Text>
          <Text style={styles.copy}>Kopiuj</Text>
        </Pressable>

        <PrimaryButton label="UDOSTĘPNIJ KOD" onPress={shareCode} />

        <Text style={styles.section}>Członkowie</Text>
        <View style={styles.card}>
          {(child?.members ?? []).map((member, index, list) => (
            <View
              key={member.id}
              style={[styles.member, index === list.length - 1 && styles.lastMember]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.memberName}>
                  {member.name}
                  {member.role === 'owner' ? ' (Ty)' : ''}
                </Text>
                <Text style={styles.memberRole}>
                  {member.role === 'owner' ? 'Właściciel' : 'Członek'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIcon: {
    fontSize: 48,
  },
  lead: {
    textAlign: 'center',
    color: Palette.textSecondary,
    fontSize: 15,
    marginBottom: 16,
  },
  codeBox: {
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  code: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
    color: Palette.text,
  },
  copy: {
    color: Palette.greenDark,
    fontWeight: '600',
  },
  section: {
    marginTop: 28,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  member: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F0',
  },
  lastMember: {
    borderBottomWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: '700',
    color: Palette.greenDark,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.text,
  },
  memberRole: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
});
